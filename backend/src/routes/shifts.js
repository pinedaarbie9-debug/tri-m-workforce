// backend/src/routes/shifts.js
import { Router } from "express";
import crypto from "node:crypto";
import { q, pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getZodError } from "../utils/helpers.js";
import { logAudit } from "../utils/auditlog.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import { ROLE_GROUPS } from "../utils/roles.js";
import {
  createShiftSchema,
  assignShiftSchema,
  shiftRangeSchema,
} from "../validators/businessValidator.js";

const router = Router();
router.use(requireAuth);

// Tumatanggap ng HH:mm o HH:mm:ss; sine-save bilang "HH:mm"
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

function readTimes(body, { required }) {
  const hasStart = body?.start_time !== undefined && body?.start_time !== "";
  const hasEnd = body?.end_time !== undefined && body?.end_time !== "";

  if (!hasStart && !hasEnd) {
    return required ? { error: "start_time and end_time are required (HH:mm)." } : { times: null };
  }
  if (!hasStart || !hasEnd) {
    return { error: "Provide both start_time and end_time (HH:mm)." };
  }

  const s = TIME_RE.exec(String(body.start_time).trim());
  const e = TIME_RE.exec(String(body.end_time).trim());
  if (!s || !e) return { error: "start_time and end_time must be in HH:mm format." };

  const start_time = `${s[1]}:${s[2]}`;
  const end_time = `${e[1]}:${e[2]}`;
  if (start_time === end_time) {
    return { error: "start_time and end_time must not be the same." };
  }
  // end < start = overnight shift (natatapos kinabukasan). Pinapayagan.
  return { times: { start_time, end_time } };
}

// ============================================================
// Date helpers (UTC-based para walang timezone shift sa "YYYY-MM-DD")
// ============================================================
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

// Art. 91, Labor Code: hindi lalampas sa 6 na sunod-sunod na araw ng trabaho
const MAX_CONSECUTIVE_DAYS = 6;
const MAX_RANGE_DAYS = 62;
const INSERT_CHUNK = 200;

// Timezone ng kumpanya — dito kinukuha ang "ngayon" para tama kahit UTC ang server
const APP_TIMEZONE = "Asia/Manila";

const parseDate = (s) => new Date(`${s}T00:00:00Z`);
const fmtDate = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => fmtDate(new Date(parseDate(s).getTime() + n * DAY_MS));
const dayOfWeek = (s) => parseDate(s).getUTCDay();

// Petsa ngayon (YYYY-MM-DD) sa Asia/Manila
function todayStr() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Ang ngayon mismo ay pwede pa; bawal ang mga araw bago nito
const isPastDate = (s) => s < todayStr();

function isValidDate(s) {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const d = parseDate(s);
  return !Number.isNaN(d.getTime()) && fmtDate(d) === s;
}

function toDateStr(v) {
  if (!v) return null;
  if (v instanceof Date) return fmtDate(v);
  return String(v).slice(0, 10);
}

function enumerateDates(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

// Ilang sunod-sunod na araw ng trabaho ang mabubuo kung idadagdag ang `date`
function streakIfAdded(workSet, date) {
  let back = 0;
  while (back <= MAX_CONSECUTIVE_DAYS && workSet.has(addDays(date, -(back + 1)))) back++;
  let fwd = 0;
  while (fwd <= MAX_CONSECUTIVE_DAYS && workSet.has(addDays(date, fwd + 1))) fwd++;
  return back + 1 + fwd;
}

const INACTIVE_STATUSES = new Set([
  "inactive", "terminated", "resigned", "separated", "deleted", "archived",
]);

function employeeName(e) {
  const full = (e.full_name ?? "").trim();
  if (full) return full;
  return `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "—";
}

// ============================================================
// GET /shifts — LAHAT ng authenticated users (view shift types)
// ============================================================
router.get("/", async (req, res) => {
  try {
    const rows = await q(
      `SELECT id, type, name, color,
              LEFT(CAST(start_time AS text), 5) AS start_time,
              LEFT(CAST(end_time AS text), 5) AS end_time
       FROM shifts ORDER BY name ASC`
    );
    return res.json(rows);
  } catch (err) {
    return safeError(res, err, "Failed to fetch shifts.");
  }
});

// ============================================================
// POST /shifts — MANAGEMENT (admin, hr_manager, supervisor)
// Body: { type, name, color?, start_time: "HH:mm", end_time: "HH:mm" }
// ============================================================
router.post(
  "/",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const parsed = createShiftSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, getZodError(parsed));
      const { type, name, color } = parsed.data;

      const t = readTimes(req.body, { required: true });
      if (t.error) return res.status(400).json({ error: t.error });
      const { start_time, end_time } = t.times;

      const id = crypto.randomUUID();
      await q(
        `INSERT INTO shifts (id, type, name, color, start_time, end_time)
         VALUES (:id, :type, :name, :color, CAST(:start_time AS time), CAST(:end_time AS time))`,
        { id, type, name, color: color ?? "#7c3aed", start_time, end_time }
      );

      await logAudit({
        userId: req.user.id,
        action: "create",
        module: "shifts",
        recordId: id,
        newValues: { type, name, color: color ?? "#7c3aed", start_time, end_time },
        ip: req.ip,
      });

      return res.status(201).json({ id });
    } catch (err) {
      return safeError(res, err, "Failed to create shift.");
    }
  }
);

// ============================================================
// PATCH /shifts/:id — itakda/palitan ang oras ng existing shift type
// Body: { start_time: "HH:mm", end_time: "HH:mm" }
// ============================================================
router.patch(
  "/:id",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const t = readTimes(req.body, { required: true });
      if (t.error) return res.status(400).json({ error: t.error });
      const { start_time, end_time } = t.times;

      const found = await q("SELECT id FROM shifts WHERE id = :id", { id: req.params.id });
      if (!found || found.length === 0) {
        return res.status(404).json({ error: "Shift not found." });
      }

      await q(
        `UPDATE shifts
         SET start_time = CAST(:start_time AS time), end_time = CAST(:end_time AS time)
         WHERE id = :id`,
        { id: req.params.id, start_time, end_time }
      );

      await logAudit({
        userId: req.user.id,
        action: "update",
        module: "shifts",
        recordId: req.params.id,
        newValues: { start_time, end_time },
        ip: req.ip,
      });

      return res.json({ id: req.params.id, start_time, end_time });
    } catch (err) {
      return safeError(res, err, "Failed to update shift.");
    }
  }
);

// ============================================================
// GET /shifts/assignments/me — sariling schedule (LAHAT)
// ============================================================
router.get("/assignments/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "No linked employee record." });
    }
    const parsed = shiftRangeSchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { from, to } = parsed.data;

    const rows = await q(
      `
      SELECT
        es.id, es.date, es.employee_id, es.shift_id,
        s.name AS shift_name, s.type AS shift_type, s.color AS shift_color,
        LEFT(CAST(s.start_time AS text), 5) AS shift_start,
        LEFT(CAST(s.end_time AS text), 5) AS shift_end
      FROM employee_shifts es
      JOIN shifts s ON s.id = es.shift_id
      WHERE es.employee_id = :employee_id AND es.date BETWEEN :from AND :to
      ORDER BY es.date ASC
      `,
      { employee_id: req.user.employee_id, from, to }
    );
    return res.json(rows);
  } catch (err) {
    return safeError(res, err, "Failed to fetch schedule.");
  }
});

// ============================================================
// GET /shifts/assignments — MANAGEMENT only (all employees)
// ============================================================
router.get(
  "/assignments",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const parsed = shiftRangeSchema.safeParse(req.query);
      if (!parsed.success) return validationError(res, getZodError(parsed));
      const { from, to } = parsed.data;

      const rows = await q(
        `
        SELECT
          es.id, es.date, es.employee_id, es.shift_id,
          COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
          d.name AS department_name,
          s.name AS shift_name, s.type AS shift_type, s.color AS shift_color,
          LEFT(CAST(s.start_time AS text), 5) AS shift_start,
          LEFT(CAST(s.end_time AS text), 5) AS shift_end
        FROM employee_shifts es
        JOIN employees e ON e.id = es.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        JOIN shifts s ON s.id = es.shift_id
        WHERE es.date BETWEEN :from AND :to
        ORDER BY es.date ASC
        `,
        { from, to }
      );
      return res.json(rows);
    } catch (err) {
      return safeError(res, err, "Failed to fetch assignments.");
    }
  }
);

// ============================================================
// POST /shifts/assignments — MANAGEMENT only
// - Bawal sa nakaraang petsa (400)
// - 6-day rule: 409 kapag makakabuo ng higit 6 na sunod-sunod na araw
// ============================================================
router.post(
  "/assignments",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const parsed = assignShiftSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, getZodError(parsed));
      const { employee_id, shift_id, date } = parsed.data;

      const day = toDateStr(date);

      // Bawal mag-schedule pabalik sa petsang lumipas na
      if (isValidDate(day) && isPastDate(day)) {
        return res.status(400).json({
          error: "Cannot schedule a shift on a past date. Only today or future dates are allowed.",
        });
      }

      if (isValidDate(day)) {
        const existing = await q(
          `SELECT date FROM employee_shifts
           WHERE employee_id = :employee_id
             AND date BETWEEN CAST(:f AS date) AND CAST(:t AS date)`,
          { employee_id, f: addDays(day, -7), t: addDays(day, 7) }
        );
        const workSet = new Set(existing.map((r) => toDateStr(r.date)));
        if (!workSet.has(day)) {
          const streak = streakIfAdded(workSet, day);
          if (streak > MAX_CONSECUTIVE_DAYS) {
            return res.status(409).json({
              error:
                `Cannot assign: this would make ${streak} consecutive working days ` +
                `(limit is ${MAX_CONSECUTIVE_DAYS}, Art. 91 Labor Code). Give the employee a rest day first.`,
            });
          }
        }
      }

      const id = crypto.randomUUID();
      await q(
        `INSERT INTO employee_shifts (id, employee_id, shift_id, date) VALUES (:id, :employee_id, :shift_id, :date)`,
        { id, employee_id, shift_id, date }
      );

      await logAudit({
        userId: req.user.id,
        action: "create",
        module: "employee_shifts",
        recordId: id,
        newValues: { employee_id, shift_id, date },
        ip: req.ip,
      });

      return res.status(201).json({ id });
    } catch (err) {
      return safeError(res, err, "Failed to assign shift.");
    }
  }
);

// ============================================================
// POST /shifts/auto-schedule — MANAGEMENT only
// Body: {
//   from: "YYYY-MM-DD", to: "YYYY-MM-DD",
//   shift_id: string,
//   days_per_week?: 1..6 (default 5),
//   department_id?: string,
//   employee_ids?: string[],
//   mode?: "preview" | "apply"   (default "preview")
// }
// Rules-based (walang LLM). Hindi gumagalaw sa existing assignments,
// nilalaktawan ang approved leave, at hindi lalampas sa 6 na sunod-sunod
// na araw. Bawal ang `from` na nakaraan na. Leave Management ay READ-ONLY dito.
// ============================================================
router.post(
  "/auto-schedule",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const b = req.body ?? {};
      const mode = b.mode === "apply" ? "apply" : "preview";
      const from = String(b.from ?? "");
      const to = String(b.to ?? "");
      const shiftId = String(b.shift_id ?? "");
      const daysPerWeek = b.days_per_week === undefined ? 5 : Number(b.days_per_week);
      const departmentId = b.department_id ? String(b.department_id) : null;
      const employeeIds = Array.isArray(b.employee_ids) ? b.employee_ids.map(String) : null;

      if (!isValidDate(from) || !isValidDate(to)) {
        return res.status(400).json({ error: "from and to must be valid dates (YYYY-MM-DD)." });
      }
      if (to < from) {
        return res.status(400).json({ error: "to must not be earlier than from." });
      }
      // Bawal mag-auto-schedule pabalik sa petsang lumipas na
      if (isPastDate(from)) {
        return res.status(400).json({
          error: `Cannot auto-schedule starting on a past date. The earliest allowed start is ${todayStr()}.`,
        });
      }
      const dates = enumerateDates(from, to);
      if (dates.length > MAX_RANGE_DAYS) {
        return res.status(400).json({ error: `Date range is limited to ${MAX_RANGE_DAYS} days.` });
      }
      if (!shiftId) {
        return res.status(400).json({ error: "shift_id is required." });
      }
      if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > MAX_CONSECUTIVE_DAYS) {
        return res.status(400).json({
          error: `days_per_week must be a whole number from 1 to ${MAX_CONSECUTIVE_DAYS}.`,
        });
      }

      const shift = await q("SELECT id, name FROM shifts WHERE id = :id", { id: shiftId });
      if (!shift || shift.length === 0) {
        return res.status(404).json({ error: "Shift not found." });
      }

      // --- Mga employee ---
      const empRows = await q(
        `SELECT e.*, d.name AS department_name
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         ORDER BY e.department_id, e.id`
      );
      let employees = empRows.filter((e) => {
        if (e.deleted_at) return false;
        if (e.status && INACTIVE_STATUSES.has(String(e.status).toLowerCase())) return false;
        if (departmentId && String(e.department_id) !== departmentId) return false;
        if (employeeIds && !employeeIds.includes(String(e.id))) return false;
        return true;
      });
      employees.sort((a, b2) =>
        String(a.employee_code ?? a.id).localeCompare(String(b2.employee_code ?? b2.id))
      );

      if (employees.length === 0) {
        return res.status(400).json({ error: "No eligible employees found for this selection." });
      }

      // --- Existing assignments (may buffer na 7 araw bawat gilid para sa streak check) ---
      const existing = await q(
        `SELECT employee_id, date FROM employee_shifts
         WHERE date BETWEEN CAST(:f AS date) AND CAST(:t AS date)`,
        { f: addDays(from, -7), t: addDays(to, 7) }
      );
      const workByEmp = new Map();
      for (const r of existing) {
        const key = String(r.employee_id);
        if (!workByEmp.has(key)) workByEmp.set(key, new Set());
        workByEmp.get(key).add(toDateStr(r.date));
      }

      // --- Approved leaves (READ-ONLY) ---
      const leaveRows = await q(
        `SELECT * FROM leave_requests WHERE status = 'approved'`
      );
      const leaveByEmp = new Map();
      for (const l of leaveRows) {
        const start = toDateStr(l.start_date ?? l.from_date ?? l.date_from);
        const end = toDateStr(l.end_date ?? l.to_date ?? l.date_to) ?? start;
        if (!isValidDate(start) || !isValidDate(end)) continue;
        if (end < from || start > to) continue;
        const key = String(l.employee_id);
        if (!leaveByEmp.has(key)) leaveByEmp.set(key, new Set());
        const set = leaveByEmp.get(key);
        for (const d of enumerateDates(start < from ? from : start, end > to ? to : end)) set.add(d);
      }

      // --- Scheduling ---
      const restCount = 7 - daysPerWeek;
      const deptCounters = new Map();
      const assignments = [];
      const skipped = [];

      for (const emp of employees) {
        const empKey = String(emp.id);
        const deptKey = String(emp.department_id ?? "none");
        const idxInDept = deptCounters.get(deptKey) ?? 0;
        deptCounters.set(deptKey, idxInDept + 1);

        // I-stagger ang rest days para pantay ang coverage bawat department
        const offset = idxInDept % 7;
        const restDows = new Set();
        for (let k = 0; k < restCount; k++) restDows.add((offset + k) % 7);

        if (!workByEmp.has(empKey)) workByEmp.set(empKey, new Set());
        const work = workByEmp.get(empKey);
        const leave = leaveByEmp.get(empKey) ?? new Set();
        const name = employeeName(emp);

        for (const date of dates) {
          if (work.has(date)) continue; // may shift na, huwag galawin
          if (leave.has(date)) {
            skipped.push({ employee_id: empKey, employee_name: name, date, reason: "on_leave" });
            continue;
          }
          if (restDows.has(dayOfWeek(date))) continue; // planned rest day
          if (streakIfAdded(work, date) > MAX_CONSECUTIVE_DAYS) {
            skipped.push({ employee_id: empKey, employee_name: name, date, reason: "max_consecutive_days" });
            continue;
          }
          work.add(date);
          assignments.push({
            employee_id: empKey,
            employee_name: name,
            department_name: emp.department_name ?? null,
            date,
            shift_id: shiftId,
          });
        }
      }

      const summary = {
        employees: new Set(assignments.map((a) => a.employee_id)).size,
        assignments: assignments.length,
        skipped_on_leave: skipped.filter((s) => s.reason === "on_leave").length,
        skipped_max_consecutive: skipped.filter((s) => s.reason === "max_consecutive_days").length,
      };

      if (mode === "preview") {
        return res.json({ mode, from, to, summary, assignments, skipped });
      }

      // --- Apply: iisang transaction ---
      let inserted = 0;
      if (assignments.length > 0) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          for (let i = 0; i < assignments.length; i += INSERT_CHUNK) {
            const chunk = assignments.slice(i, i + INSERT_CHUNK);
            const values = [];
            const params = [];
            chunk.forEach((a, n) => {
              const o = n * 4;
              values.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4})`);
              params.push(crypto.randomUUID(), a.employee_id, a.shift_id, a.date);
            });
            const r = await client.query(
              `INSERT INTO employee_shifts (id, employee_id, shift_id, date)
               VALUES ${values.join(", ")}
               ON CONFLICT DO NOTHING`,
              params
            );
            inserted += r.rowCount ?? 0;
          }
          await client.query("COMMIT");
        } catch (err) {
          await client.query("ROLLBACK").catch(() => {});
          throw err;
        } finally {
          client.release();
        }
      }

      await logAudit({
        userId: req.user.id,
        action: "create",
        module: "employee_shifts",
        recordId: null,
        newValues: {
          auto_schedule: true,
          from,
          to,
          shift_id: shiftId,
          days_per_week: daysPerWeek,
          department_id: departmentId,
          inserted,
        },
        ip: req.ip,
      });

      return res.status(201).json({ mode, from, to, summary, inserted });
    } catch (err) {
      return safeError(res, err, "Failed to auto-schedule shifts.");
    }
  }
);

export default router;