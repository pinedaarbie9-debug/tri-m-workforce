// backend/src/routes/timesheets.js
import { Router } from "express";
import crypto from "node:crypto";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getZodError } from "../utils/helpers.js";
import { logAudit } from "../utils/auditlog.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import { ROLE_GROUPS } from "../utils/roles.js";
import {
  generateTimesheetSchema,
  updateTimesheetStatusSchema,
} from "../validators/businessValidator.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const rows = await q(`
        SELECT
          t.id, t.period_start, t.period_end, t.status,
          t.total_regular_hours, t.total_overtime_hours,
          t.submitted_at, t.approved_at, t.notes,
          COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
          e.employee_code,
          d.name AS department
        FROM timesheets t
        JOIN employees e ON e.id = t.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        ORDER BY t.period_start DESC, employee_name ASC
      `);
      return res.json(rows);
    } catch (err) {
      return safeError(res, err, "Failed to fetch timesheets.");
    }
  }
);

router.get("/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "No linked employee record." });
    }
    const rows = await q(
      `
      SELECT id, period_start, period_end, status, total_regular_hours, total_overtime_hours, submitted_at, approved_at, notes
      FROM timesheets
      WHERE employee_id = :employee_id
      ORDER BY period_start DESC
      `,
      { employee_id: req.user.employee_id }
    );
    return res.json(rows);
  } catch (err) {
    return safeError(res, err, "Failed to fetch timesheets.");
  }
});

router.post(
  "/generate",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const parsed = generateTimesheetSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, getZodError(parsed));
      const { employee_id, period_start, period_end } = parsed.data;

      const attendanceRows = await q(
        `
        SELECT date, check_in, check_out, status, work_hours, overtime_hours
        FROM attendance
        WHERE employee_id = :employee_id AND date BETWEEN :period_start AND :period_end
        ORDER BY date ASC
        `,
        { employee_id, period_start, period_end }
      );

      if (attendanceRows.length === 0) {
        return validationError(
          res,
          "No attendance records found for this period."
        );
      }

      const totalRegular = attendanceRows.reduce(
        (sum, r) => sum + Number(r.work_hours ?? 0),
        0
      );
      const totalOvertime = attendanceRows.reduce(
        (sum, r) => sum + Number(r.overtime_hours ?? 0),
        0
      );
      const entries = JSON.stringify(attendanceRows);

      const id = crypto.randomUUID();
      await q(
        `
        INSERT INTO timesheets (id, employee_id, period_start, period_end, status, total_regular_hours, total_overtime_hours, entries)
        VALUES (:id, :employee_id, :period_start, :period_end, 'draft', :total_regular, :total_overtime, :entries)
        `,
        {
          id,
          employee_id,
          period_start,
          period_end,
          total_regular: totalRegular,
          total_overtime: totalOvertime,
          entries,
        }
      );

      await logAudit({
        userId: req.user.id,
        action: "create",
        module: "timesheets",
        recordId: id,
        newValues: { employee_id, period_start, period_end },
        ip: req.ip,
      });

      return res.status(201).json({
        id,
        total_regular_hours: totalRegular,
        total_overtime_hours: totalOvertime,
      });
    } catch (err) {
      return safeError(res, err, "Failed to generate timesheet.");
    }
  }
);

router.post("/:id/submit", async (req, res) => {
  try {
    const rows = await q(
      "SELECT employee_id, status FROM timesheets WHERE id = :id",
      { id: req.params.id }
    );
    if (!rows[0])
      return res.status(404).json({ error: "Timesheet not found." });
    if (rows[0].employee_id !== req.user.employee_id) {
      return res
        .status(403)
        .json({ error: "You can only submit your own timesheets." });
    }
    if (rows[0].status !== "draft") {
      return validationError(
        res,
        "This timesheet has already been submitted or decided."
      );
    }

    await q(
      "UPDATE timesheets SET status = 'submitted', submitted_at = NOW() WHERE id = :id",
      { id: req.params.id }
    );

    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Failed to submit timesheet.");
  }
});

router.patch(
  "/:id/status",
  requireRole(...ROLE_GROUPS.APPROVERS),
  async (req, res) => {
    try {
      const parsed = updateTimesheetStatusSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, getZodError(parsed));
      const { status } = parsed.data;

      await q(
        "UPDATE timesheets SET status = :status, approved_at = NOW(), approver_id = :approver_id WHERE id = :id",
        { status, approver_id: req.user.id, id: req.params.id }
      );

      await logAudit({
        userId: req.user.id,
        action: "update",
        module: "timesheets",
        recordId: req.params.id,
        newValues: { status },
        ip: req.ip,
      });

      return res.json({ ok: true });
    } catch (err) {
      return safeError(res, err, "Failed to update timesheet status.");
    }
  }
);

export default router;