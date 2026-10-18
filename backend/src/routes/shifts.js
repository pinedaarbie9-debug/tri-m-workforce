// backend/src/routes/shifts.js
import { Router } from "express";
import crypto from "node:crypto";
import { q } from "../db.js";
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
// ============================================================
router.post(
  "/assignments",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const parsed = assignShiftSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, getZodError(parsed));
      const { employee_id, shift_id, date } = parsed.data;

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

export default router;