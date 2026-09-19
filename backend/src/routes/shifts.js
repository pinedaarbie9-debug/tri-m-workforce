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

// ============================================================
// GET /shifts — LAHAT ng authenticated users (view shift types)
// ============================================================
router.get("/", async (req, res) => {
  try {
    const rows = await q("SELECT * FROM shifts ORDER BY name ASC");
    return res.json(rows);
  } catch (err) {
    return safeError(res, err, "Failed to fetch shifts.");
  }
});

// ============================================================
// POST /shifts — MANAGEMENT (admin, hr_manager, supervisor)
// ============================================================
router.post(
  "/",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const parsed = createShiftSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, getZodError(parsed));
      const { type, name, color } = parsed.data;

      const id = crypto.randomUUID();
      await q(
        `INSERT INTO shifts (id, type, name, color) VALUES (:id, :type, :name, :color)`,
        { id, type, name, color: color ?? "#7c3aed" }
      );

      await logAudit({
        userId: req.user.id,
        action: "create",
        module: "shifts",
        recordId: id,
        newValues: { type, name, color: color ?? "#7c3aed" },
        ip: req.ip,
      });

      return res.status(201).json({ id });
    } catch (err) {
      return safeError(res, err, "Failed to create shift.");
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
        s.name AS shift_name, s.type AS shift_type, s.color AS shift_color
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
          s.name AS shift_name, s.type AS shift_type, s.color AS shift_color
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