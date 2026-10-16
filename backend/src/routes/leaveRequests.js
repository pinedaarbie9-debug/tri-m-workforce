// backend/src/routes/leaveRequests.js
import { Router } from "express";
import crypto from "node:crypto";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { safeParseJSON, parseSettingValue, getZodError } from "../utils/helpers.js";
import { logAudit } from "../utils/auditlog.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import { notifyAdmins, notifyEmployeeOwner } from "../utils/notify.js";
import { ROLE_GROUPS } from "../utils/roles.js";
import {
  LEAVE_POLICY,
  checkEligibility,
  daysBetween,
  yearlyEntitlement,
} from "../utils/leavePolicy.js";
import {
  createLeaveRequestSchema,
  adminCreateLeaveRequestSchema,
  updateLeaveStatusSchema,
} from "../validators/businessValidator.js";

const router = Router();
router.use(requireAuth);

const TZ = process.env.APP_TIMEZONE ?? "Asia/Manila";
const todayISO = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });

async function loadEmployee(id) {
  const rows = await q(
    "SELECT id, employment_type, status, hire_date FROM employees WHERE id = :id LIMIT 1",
    { id }
  );
  return rows[0] ?? null;
}

async function loadSettings() {
  const rows = await q(
    `SELECT "key", value FROM settings WHERE "key" IN ('advance_notice_days', 'annual_leave_days', 'sick_leave_days')`
  );
  const settings = {};
  rows.forEach((r) => { settings[r.key] = parseSettingValue(r.value); });
  return settings;
}

async function usedDays(employeeId, leaveType, year) {
  const rows = await q(
    `SELECT COALESCE(SUM(days_count), 0) AS used
     FROM leave_requests
     WHERE employee_id = :employee_id
       AND leave_type = :leave_type
       AND status IN ('pending', 'approved')
       AND EXTRACT(YEAR FROM start_date) = :year`,
    { employee_id: employeeId, leave_type: leaveType, year }
  );
  return Number(rows[0]?.used ?? 0);
}

// Isang validation para sa self-filing at admin-filing.
// Returns { error, status? } o { days_count }.
async function validateFiling({ employee_id, leave_type, start_date, end_date, self }) {
  const emp = await loadEmployee(employee_id);
  const elig = checkEligibility(emp, leave_type, start_date, { self });
  if (!elig.ok) return { error: elig.message, status: elig.notFound && self ? 404 : 400 };

  const start = new Date(start_date);
  if (new Date(end_date) < start) return { error: "End date must be after start date." };
  const days_count = daysBetween(start_date, end_date);

  const policy = LEAVE_POLICY[leave_type];
  if (policy.maxPerRequest && days_count > policy.maxPerRequest) {
    return {
      error: `${policy.label} is limited to ${policy.maxPerRequest} days per request (${policy.basis}). Requested: ${days_count}.`,
    };
  }

  const settings = await loadSettings();

  // Advance notice: self-filing lang, at hindi sa urgent na leave
  if (self && !policy.noAdvanceNotice) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilStart = Math.round((start - today) / 86400000);
    const advanceNoticeDays = Number(settings.advance_notice_days ?? 0);
    if (daysUntilStart < advanceNoticeDays) {
      return { error: `At least ${advanceNoticeDays} days advance notice is required for this leave type.` };
    }
  }

  // Yearly balance
  const cap = yearlyEntitlement(leave_type, settings);
  if (cap !== null) {
    const year = Number(String(start_date).slice(0, 4));
    const used = await usedDays(employee_id, leave_type, year);
    const remaining = cap - used;
    if (days_count > remaining) {
      return {
        error: `Insufficient ${policy.label.toLowerCase()} balance. Remaining: ${Math.max(remaining, 0)}, requested: ${days_count}.`,
      };
    }
  }

  return { days_count };
}

function sendFilingError(res, v) {
  return v.status === 404
    ? res.status(404).json({ error: v.error })
    : validationError(res, v.error);
}

async function insertLeave({ employee_id, leave_type, start_date, end_date, days_count, reason, attachment }) {
  const id = crypto.randomUUID();
  await q(
    `INSERT INTO leave_requests (
       id, employee_id, leave_type, start_date, end_date, days_count, reason, status,
       attachment_data, attachment_name, attachment_type, attachment_size
     ) VALUES (
       :id, :employee_id, :leave_type, :start_date, :end_date, :days_count, :reason, 'pending',
       :attachment_data, :attachment_name, :attachment_type, :attachment_size
     )`,
    {
      id,
      employee_id,
      leave_type,
      start_date,
      end_date,
      days_count,
      reason,
      attachment_data: attachment?.data ?? null,
      attachment_name: attachment?.name ?? null,
      attachment_type: attachment?.type ?? null,
      attachment_size: attachment?.size ?? null,
    }
  );
  return id;
}

// GET /leave-requests/me
router.get("/me", async (req, res) => {
  try {
    if (!req.user.employee_id) return res.status(404).json({ error: "No linked employee record." });
    const rows = await q(
      `SELECT id, employee_id, leave_type, start_date, end_date, days_count,
              reason, status, created_at, attachment_name, attachment_type, attachment_size
       FROM leave_requests
       WHERE employee_id = :employee_id
       ORDER BY created_at DESC`,
      { employee_id: req.user.employee_id }
    );
    return res.json(rows);
  } catch (err) {
    return safeError(res, err, "Failed to fetch your leave requests.");
  }
});

// GET /leave-requests/me/balance — balance at eligibility bawat leave type
router.get("/me/balance", async (req, res) => {
  try {
    if (!req.user.employee_id) return res.status(404).json({ error: "No linked employee record." });
    const emp = await loadEmployee(req.user.employee_id);
    if (!emp) return res.status(404).json({ error: "Employee record not found." });

    const today = todayISO();
    const year = Number(today.slice(0, 4));
    const settings = await loadSettings();

    const usedRows = await q(
      `SELECT leave_type, COALESCE(SUM(days_count), 0) AS used
       FROM leave_requests
       WHERE employee_id = :employee_id
         AND status IN ('pending', 'approved')
         AND EXTRACT(YEAR FROM start_date) = :year
       GROUP BY leave_type`,
      { employee_id: emp.id, year }
    );
    const usedMap = {};
    usedRows.forEach((r) => { usedMap[r.leave_type] = Number(r.used); });

    const balances = Object.entries(LEAVE_POLICY).map(([type, p]) => {
      const elig = checkEligibility(emp, type, today, { self: true });
      const cap = yearlyEntitlement(type, settings);
      const used = usedMap[type] ?? 0;
      return {
        leave_type: type,
        label: p.label,
        basis: p.basis,
        eligible: elig.ok,
        reason: elig.ok ? null : elig.message,
        yearly_limit: cap,
        max_per_request: p.maxPerRequest ?? null,
        used,
        remaining: cap === null ? null : Math.max(cap - used, 0),
      };
    });

    return res.json({ year, employment_type: emp.employment_type, hire_date: emp.hire_date, balances });
  } catch (err) {
    return safeError(res, err, "Failed to fetch leave balance.");
  }
});

// POST /leave-requests/me — self filing
router.post("/me", async (req, res) => {
  try {
    if (!req.user.employee_id) return res.status(404).json({ error: "No linked employee record." });

    const parsed = createLeaveRequestSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { leave_type, start_date, end_date, reason, attachment } = parsed.data;

    const v = await validateFiling({
      employee_id: req.user.employee_id,
      leave_type, start_date, end_date,
      self: true,
    });
    if (v.error) return sendFilingError(res, v);

    const id = await insertLeave({
      employee_id: req.user.employee_id,
      leave_type, start_date, end_date, days_count: v.days_count, reason, attachment,
    });

    await logAudit({
      userId: req.user.id,
      action: "create",
      module: "leave_requests",
      recordId: id,
      newValues: { leave_type, start_date, end_date, days_count: v.days_count, has_attachment: !!attachment },
      ip: req.ip,
    });

    await notifyAdmins({
      type: "leave_request",
      title: "New Leave Request",
      message: `${req.user.full_name} filed a ${leave_type} leave request (${start_date} to ${end_date}).`,
    });

    return res.status(201).json({ id });
  } catch (err) {
    return safeError(res, err, "Failed to submit leave request.");
  }
});

// GET /leave-requests — MANAGEMENT
router.get("/", requireRole(...ROLE_GROUPS.MANAGEMENT), async (req, res) => {
  try {
    const rows = await q(`
      SELECT
        l.id, l.employee_id, l.leave_type, l.start_date, l.end_date, l.days_count,
        l.reason, l.status, l.created_at,
        l.attachment_name, l.attachment_type, l.attachment_size,
        json_build_object(
          'id', e.id,
          'full_name', COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)),
          'employee_code', e.employee_code,
          'avatar_url', e.avatar_url,
          'employment_type', e.employment_type,
          'department', json_build_object('name', d.name)
        ) AS employee
      FROM leave_requests l
      JOIN employees e ON e.id = l.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      ORDER BY l.created_at DESC
    `);
    return res.json(rows.map((r) => ({ ...r, employee: safeParseJSON(r.employee) })));
  } catch (err) {
    return safeError(res, err, "Failed to fetch leave requests.");
  }
});

// GET /leave-requests/:id/attachment
router.get("/:id/attachment", requireRole(...ROLE_GROUPS.MANAGEMENT), async (req, res) => {
  try {
    const rows = await q(
      `SELECT attachment_data, attachment_name, attachment_type, attachment_size
       FROM leave_requests WHERE id = :id LIMIT 1`,
      { id: req.params.id }
    );
    const leave = rows[0];
    if (!leave || !leave.attachment_data) return res.status(404).json({ error: "No attachment found." });

    return res.json({
      data: leave.attachment_data,
      name: leave.attachment_name,
      type: leave.attachment_type,
      size: leave.attachment_size,
    });
  } catch (err) {
    return safeError(res, err, "Failed to fetch attachment.");
  }
});

// POST /leave-requests — MANAGEMENT (filing on behalf)
router.post("/", requireRole(...ROLE_GROUPS.MANAGEMENT), async (req, res) => {
  try {
    const parsed = adminCreateLeaveRequestSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { employee_id, leave_type, start_date, end_date, reason, attachment } = parsed.data;

    const v = await validateFiling({ employee_id, leave_type, start_date, end_date, self: false });
    if (v.error) return sendFilingError(res, v);

    const id = await insertLeave({
      employee_id, leave_type, start_date, end_date, days_count: v.days_count, reason, attachment,
    });

    await logAudit({
      userId: req.user.id,
      action: "create",
      module: "leave_requests",
      recordId: id,
      newValues: { employee_id, leave_type, start_date, end_date, has_attachment: !!attachment },
      ip: req.ip,
    });

    const empRows = await q(
      "SELECT COALESCE(NULLIF(full_name, ''), CONCAT(first_name, ' ', last_name)) AS name FROM employees WHERE id = :id",
      { id: employee_id }
    );
    const empName = empRows[0]?.name ?? "An employee";

    await notifyAdmins({
      type: "leave_request",
      title: "New Leave Request",
      message: `${empName} has a ${leave_type} leave request (${start_date} to ${end_date}) filed by an admin.`,
    });
    await notifyEmployeeOwner(employee_id, {
      type: "leave_request",
      title: "Leave Request Filed",
      message: `A ${leave_type} leave request (${start_date} to ${end_date}) was filed for you.`,
    });

    return res.status(201).json({ id });
  } catch (err) {
    return safeError(res, err, "Failed to create leave request.");
  }
});

// PATCH /leave-requests/:id/status — APPROVERS
router.patch("/:id/status", requireRole(...ROLE_GROUPS.APPROVERS), async (req, res) => {
  try {
    const parsed = updateLeaveStatusSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { status } = parsed.data;

    const rows = await q(
      "SELECT employee_id, leave_type, start_date, end_date FROM leave_requests WHERE id = :id",
      { id: req.params.id }
    );
    if (!rows[0]) return res.status(404).json({ error: "Leave request not found." });

    await q("UPDATE leave_requests SET status = :status WHERE id = :id", { status, id: req.params.id });

    await logAudit({
      userId: req.user.id,
      action: "update",
      module: "leave_requests",
      recordId: req.params.id,
      newValues: { status },
      ip: req.ip,
    });

    await notifyEmployeeOwner(rows[0].employee_id, {
      type: status === "approved" ? "leave_approved" : "leave_rejected",
      title: status === "approved" ? "Leave Request Approved" : "Leave Request Rejected",
      message: `Your ${rows[0].leave_type} leave request (${rows[0].start_date} to ${rows[0].end_date}) has been ${status}.`,
    });

    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Failed to update leave status.");
  }
});

export default router;