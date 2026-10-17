// backend/src/routes/partnerAttendance.js
import crypto from "node:crypto";
import { Router } from "express";
import { q } from "../db.js";
import { getZodError } from "../utils/helpers.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import { partnerAttendanceQuerySchema } from "../validators/businessValidator.js";
import { LEAVE_POLICY, daysBetween } from "../utils/leavePolicy.js";
import { syncEmployeesFromHR1 } from "../services/hr1Sync.js";
import { notifyHR1LeaveStatus, recordHR1Result } from "../services/hr1Leave.js";

const router = Router();

// ============================================================
// 🔒 API key check
// ============================================================
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function requireApiKey(req, res, next) {
  const expected = process.env.PARTNER_API_KEY;

  if (!expected) {
    console.error("❌ PARTNER_API_KEY is not configured in .env");
    return res.status(500).json({ error: "Partner API not configured." });
  }

  const key = req.headers["x-api-key"];
  if (!key || !safeEqual(key, expected)) {
    return res.status(401).json({ error: "Invalid or missing API key." });
  }

  next();
}

router.use(requireApiKey);

// ============================================================
// Helpers
// ============================================================

// Hanapin ang employee base sa employee_id ng HR1 (E001, 1, EMP-001, atbp.)
async function findEmployeeByPartnerId(partnerId) {
  const raw = String(partnerId ?? "").trim();
  if (!raw) return null;

  const variants = [raw, `E${raw}`, `EMP-${raw}`];
  if (/^\d+$/.test(raw)) {
    const n = String(Number(raw));
    for (const width of [3, 4]) {
      const padded = n.padStart(width, "0");
      variants.push(`E${padded}`, `EMP-${padded}`);
    }
  }

  const unique = [...new Set(variants.map((v) => v.toUpperCase()))];
  const params = {};
  const placeholders = unique
    .map((v, i) => {
      params[`c${i}`] = v;
      return `:c${i}`;
    })
    .join(", ");

  const rows = await q(
    `SELECT id, employee_code FROM employees WHERE UPPER(employee_code) IN (${placeholders})`,
    params
  );

  for (const v of unique) {
    const hit = rows.find((r) => String(r.employee_code).toUpperCase() === v);
    if (hit) return hit;
  }
  return null;
}

// Kapag walang nahanap na employee, mag-sync MUNA ng employees galing HR1 (isang beses lang
// bawat request, at may 60s cooldown) tapos subukan ulit.
let lastOnDemandSyncAt = 0;
const ON_DEMAND_SYNC_COOLDOWN_MS = 60_000;

async function resolveEmployee(partnerId, state) {
  const found = await findEmployeeByPartnerId(partnerId);
  if (found) return found;

  const now = Date.now();
  if (!state.triedSync && now - lastOnDemandSyncAt > ON_DEMAND_SYNC_COOLDOWN_MS) {
    state.triedSync = true;
    lastOnDemandSyncAt = now;
    console.log(`🔄 Employee ${partnerId} not found. Syncing employees from HR1 once...`);
    const result = await syncEmployeesFromHR1();
    if (!result.success) console.error("❌ On-demand employee sync failed:", result.error);
    return findEmployeeByPartnerId(partnerId);
  }
  return null;
}

// "vacation" ng HR1 -> kung ano ang tunay na key sa LEAVE_POLICY ng HR2 (annual / vacation).
const LEAVE_TYPE_ALIASES = {
  vacation: ["vacation", "annual"],
  annual: ["annual", "vacation"],
};

function resolveLeaveType(raw) {
  const norm = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_leave$/, "");
  if (!norm) return null;

  const candidates = [...(LEAVE_TYPE_ALIASES[norm] ?? [norm]), `${norm}_leave`];
  return candidates.find((c) => Object.hasOwn(LEAVE_POLICY, c)) ?? null;
}

const LEAVE_STATUSES = ["pending", "approved", "rejected", "cancelled"];

function normalizeLeaveStatus(raw) {
  const s = String(raw ?? "pending").trim().toLowerCase();
  if (s === "canceled") return "cancelled";
  return LEAVE_STATUSES.includes(s) ? s : null;
}

function normalizeDate(value) {
  const s = String(value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
}

function pickString(value, max = 1000) {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s ? s.slice(0, max) : null;
}

async function notifyAdminsOfNewLeave(employee, leaveType, startDate, endDate) {
  // Hiwalay na try/catch: kapag pumalya ang notification, naka-save pa rin ang leave.
  try {
    const admins = await q(
      `SELECT id FROM users WHERE role IN ('admin', 'hr_manager') AND status = 'active'`
    );
    for (const admin of admins) {
      await q(
        `INSERT INTO notifications (user_id, type, title, message, action_url)
         VALUES (:user_id, :type, :title, :message, :action_url)`,
        {
          user_id: admin.id,
          type: "leave_request",
          title: "New Leave Request from HR1",
          message: `${employee.employee_code} filed a ${leaveType} leave from ${startDate} to ${endDate}.`,
          action_url: "/leave-management",
        }
      );
    }
  } catch (err) {
    console.error("⚠️ Leave saved but admin notification failed:", err.message);
  }
}

// ============================================================
// Per-record processors (laging nagbabalik ng result, hindi nagta-throw)
// ============================================================
async function processAttendance(att, state) {
  const base = { employee_id: att?.employee_id ?? null, date: att?.date ?? null };
  try {
    if (!att?.employee_id || !att?.date) {
      return { ...base, result: "skipped", error: "employee_id and date are required." };
    }

    const date = normalizeDate(att.date);
    if (!date) return { ...base, result: "skipped", error: "date must be YYYY-MM-DD." };

    const employee = await resolveEmployee(att.employee_id, state);
    if (!employee) {
      return {
        ...base,
        result: "skipped",
        error: `Employee ${att.employee_id} not found in HR2 (even after an HR1 employee sync).`,
      };
    }

    await q(
      `INSERT INTO attendance (employee_id, date, check_in, check_out, status, work_hours)
       VALUES (:employee_id, :date, :check_in, :check_out, :status, :work_hours)
       ON CONFLICT (employee_id, date) DO UPDATE SET
         check_in = EXCLUDED.check_in,
         check_out = EXCLUDED.check_out,
         status = EXCLUDED.status,
         work_hours = EXCLUDED.work_hours`,
      {
        employee_id: employee.id,
        date,
        check_in: att.check_in || null,
        check_out: att.check_out || null,
        status: att.status,
        work_hours: att.work_hours || null,
      }
    );
    return { ...base, result: "saved" };
  } catch (err) {
    console.error(`❌ Error saving attendance for ${att?.employee_id}:`, err.message);
    return { ...base, result: "error", error: err.message };
  }
}

async function processLeave(lv, state) {
  const referenceId = lv?.reference_id ?? lv?.leave_id ?? lv?.id ?? null;
  const base = {
    reference_id: referenceId === null ? null : String(referenceId),
    employee_id: lv?.employee_id ?? null,
  };

  try {
    if (!base.reference_id) return { ...base, result: "skipped", error: "reference_id is required." };
    if (!lv.employee_id) return { ...base, result: "skipped", error: "employee_id is required." };

    const employee = await resolveEmployee(lv.employee_id, state);
    if (!employee) {
      return {
        ...base,
        result: "skipped",
        error: `Employee ${lv.employee_id} not found in HR2 (even after an HR1 employee sync).`,
      };
    }

    const leaveType = resolveLeaveType(lv.leave_type);
    if (!leaveType) {
      return {
        ...base,
        result: "skipped",
        error: `Unknown leave_type "${lv.leave_type}". Accepted: ${Object.keys(LEAVE_POLICY).join(", ")}.`,
      };
    }

    const status = normalizeLeaveStatus(lv.status);
    if (!status) {
      return {
        ...base,
        result: "skipped",
        error: `Unknown status "${lv.status}". Accepted: ${LEAVE_STATUSES.join(", ")}.`,
      };
    }

    const startDate = normalizeDate(lv.start_date);
    const endDate = normalizeDate(lv.end_date);
    if (!startDate || !endDate) {
      return { ...base, result: "skipped", error: "start_date and end_date must be YYYY-MM-DD." };
    }
    if (endDate < startDate) {
      return { ...base, result: "skipped", error: "end_date is before start_date." };
    }

    const given = Number(lv.days_count);
    const daysCount = Number.isFinite(given) && given > 0 ? given : daysBetween(startDate, endDate);
    const reason = pickString(lv.reason ?? lv.leave_reason ?? lv.notes);

    const existing = await q(
      "SELECT id, status FROM leave_requests WHERE reference_id = :reference_id LIMIT 1",
      { reference_id: base.reference_id }
    );

    if (existing[0]) {
      const current = existing[0];

      // Kapag na-approve/reject na ng HR2, huwag ibalik sa "pending" ng re-sync ng HR1.
      if (current.status !== "pending") {
        return {
          ...base,
          result: "unchanged",
          hr2_id: current.id,
          note: `Already ${current.status} in HR2; not overwritten.`,
        };
      }

      await q(
        `UPDATE leave_requests SET
           employee_id = :employee_id,
           leave_type = :leave_type,
           start_date = :start_date,
           end_date = :end_date,
           days_count = :days_count,
           reason = :reason,
           status = :status,
           updated_at = NOW()
         WHERE id = :id`,
        {
          id: current.id,
          employee_id: employee.id,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          days_count: daysCount,
          reason,
          status: status === "cancelled" ? "cancelled" : "pending",
        }
      );
      return { ...base, result: "updated", hr2_id: current.id };
    }

    const id = crypto.randomUUID();
    await q(
      `INSERT INTO leave_requests (
         id, employee_id, leave_type, start_date, end_date, days_count, status, reference_id, reason
       ) VALUES (
         :id, :employee_id, :leave_type, :start_date, :end_date, :days_count, :status, :reference_id, :reason
       )`,
      {
        id,
        employee_id: employee.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days_count: daysCount,
        status,
        reference_id: base.reference_id,
        reason,
      }
    );

    if (status === "pending") {
      await notifyAdminsOfNewLeave(employee, leaveType, startDate, endDate);
    }

    return { ...base, result: "created", hr2_id: id };
  } catch (err) {
    // Unique index sa reference_id: may kasabay na request na nakapag-insert na.
    if (err?.code === "23505") {
      return { ...base, result: "unchanged", note: "Duplicate reference_id (already saved)." };
    }
    console.error(`❌ Error saving leave ${base.reference_id} for ${base.employee_id}:`, err.message);
    return { ...base, result: "error", error: err.message };
  }
}

// ============================================================
// POST /api/partner/sync-data
// 200 = lahat OK, 207 = may pumalya at may pumasa, 422 = lahat pumalya.
// Laging may "results" bawat record para malinaw kung ano ang na-skip at bakit.
// ============================================================
router.post("/sync-data", async (req, res) => {
  try {
    const body = req.body ?? {};
    const attendance = Array.isArray(body.attendance) ? body.attendance : [];
    const leaves = Array.isArray(body.leaves) ? body.leaves : [];

    console.log(`📥 Partner sync received: ${attendance.length} attendance, ${leaves.length} leave record(s).`);

    const state = { triedSync: false };

    const attendanceResults = [];
    for (const att of attendance) attendanceResults.push(await processAttendance(att, state));

    const leaveResults = [];
    for (const lv of leaves) leaveResults.push(await processLeave(lv, state));

    if (leaveResults.length > 0) {
      console.log("📤 Leave results:", JSON.stringify(leaveResults));
    }

    const failed = [
      ...attendanceResults.map((r) => ({ type: "attendance", ...r })),
      ...leaveResults.map((r) => ({ type: "leave", ...r })),
    ].filter((r) => r.result === "skipped" || r.result === "error");

    const total = attendance.length + leaves.length;
    const httpStatus = failed.length === 0 ? 200 : failed.length === total ? 422 : 207;
    const count = (list, value) => list.filter((r) => r.result === value).length;

    return res.status(httpStatus).json({
      success: failed.length === 0,
      message: failed.length === 0 ? "Sync process completed." : "Sync completed with errors. See results.",
      summary: {
        attendance_saved: count(attendanceResults, "saved"),
        leaves_saved: count(leaveResults, "created") + count(leaveResults, "updated"),
        leaves_created: count(leaveResults, "created"),
        leaves_updated: count(leaveResults, "updated"),
        leaves_unchanged: count(leaveResults, "unchanged"),
        failed: failed.length,
        errors: failed.length > 0 ? failed : "None",
      },
      results: { attendance: attendanceResults, leaves: leaveResults },
    });
  } catch (err) {
    console.error("❌ Fatal error during sync:", err);
    return safeError(res, err, "Failed to sync data from partner.");
  }
});

// ============================================================
// POST /api/partner/leave-status-update
// Manual / testing: i-update ang status gamit ang HR1 reference_id at ipadala sa HR1.
// (Ang normal na approve/reject sa HR2 UI ay dumadaan na sa PATCH /leave-requests/:id/status
//  at awtomatikong nagpapadala sa HR1.)
// ============================================================
router.post("/leave-status-update", async (req, res) => {
  try {
    const { reference_id, status, approved_by, reason, rejection_reason } = req.body ?? {};
    const normalized = String(status ?? "").trim().toLowerCase();

    if (!reference_id || !["approved", "rejected"].includes(normalized)) {
      return res.status(400).json({ error: "reference_id and status ('approved' or 'rejected') are required." });
    }

    const rows = await q(
      `SELECT l.id, e.employee_code
       FROM leave_requests l
       JOIN employees e ON e.id = l.employee_id
       WHERE l.reference_id = :reference_id
       LIMIT 1`,
      { reference_id: String(reference_id) }
    );
    if (!rows[0]) {
      return res.status(404).json({ error: `No leave request with reference_id ${reference_id}.` });
    }

    const finalReason = pickString(reason ?? rejection_reason, 500);

    await q(
      `UPDATE leave_requests
       SET status = :status, rejection_reason = :rejection_reason, updated_at = NOW()
       WHERE id = :id`,
      {
        status: normalized,
        rejection_reason: normalized === "rejected" ? finalReason : null,
        id: rows[0].id,
      }
    );

    const hr1 = await notifyHR1LeaveStatus({
      reference_id,
      employee_code: rows[0].employee_code,
      status: normalized,
      approved_by,
      reason: finalReason,
    });
    await recordHR1Result(rows[0].id, hr1);

    return res.status(hr1.ok ? 200 : 502).json({
      success: hr1.ok === true,
      message: hr1.ok ? "Leave status updated and sent to HR1." : "Leave status updated in HR2 but HR1 was not reached.",
      hr1_response: hr1,
    });
  } catch (err) {
    console.error("❌ Error updating leave status:", err);
    return safeError(res, err, "Failed to update leave status.");
  }
});

// ============================================================
// GET /api/partner/attendance/:employee_id
// ============================================================
router.get("/attendance/:employee_id", async (req, res) => {
  try {
    const { employee_id } = req.params;

    const parsed = partnerAttendanceQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { from, to } = parsed.data;

    const employee = await findEmployeeByPartnerId(employee_id);
    if (!employee) {
      return res.status(404).json({ error: `Employee ${employee_id} not found.` });
    }

    let sql =
      "SELECT date, check_in, check_out, work_hours, overtime_hours, status FROM attendance WHERE employee_id = :employee_id";
    const params = { employee_id: employee.id };

    if (from && to) {
      sql += " AND date BETWEEN :from AND :to";
      params.from = from;
      params.to = to;
    }
    sql += " ORDER BY date DESC";

    const rows = await q(sql, params);
    return res.json({ ok: true, employee_id, records: rows });
  } catch (err) {
    return safeError(res, err, "Failed to fetch attendance.");
  }
});

export default router;