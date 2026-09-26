// backend/src/routes/reports.js
import { Router } from "express";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getZodError } from "../utils/helpers.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import { ROLE_GROUPS } from "../utils/roles.js";
import { reportMonthSchema } from "../validators/businessValidator.js";

const router = Router();
router.use(requireAuth);

// 🔒 Reports — MANAGEMENT (admin, hr_manager, supervisor)
router.use(requireRole(...ROLE_GROUPS.REPORTERS));

const FULL_NAME_SQL =
  "COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name))";

router.get("/summary", async (req, res) => {
  try {
    const checks = await Promise.all([
      q("SELECT COUNT(*) AS c FROM attendance"),
      q("SELECT COUNT(*) AS c FROM employees WHERE deleted_at IS NULL"),
      q("SELECT COUNT(*) AS c FROM leave_requests"),
      q("SELECT COUNT(*) AS c FROM timesheets"),
      q("SELECT COUNT(*) AS c FROM attendance WHERE overtime_hours > 0"),
      q("SELECT COUNT(*) AS c FROM audit_logs"),
    ]);
    const hasData = checks.map(([row]) => row.c > 0);
    return res.json({
      totalReports: 6,
      ready: hasData.filter(Boolean).length,
    });
  } catch (err) {
    return safeError(res, err, "Failed to load reports summary.");
  }
});

router.get("/attendance-summary", async (req, res) => {
  try {
    const parsed = reportMonthSchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const month = parsed.data.month || new Date().toISOString().slice(0, 7);

    const rows = await q(
      `SELECT ${FULL_NAME_SQL} AS full_name, a.date, a.status, a.check_in, a.check_out, a.work_hours, a.overtime_hours
       FROM attendance a JOIN employees e ON e.id = a.employee_id
       WHERE DATE_FORMAT(a.date, '%Y-%m') = :month
       ORDER BY a.date DESC`,
      { month }
    );
    return res.json({ type: "Attendance", month, rows });
  } catch (err) {
    return safeError(res, err, "Failed to generate attendance summary.");
  }
});

router.get("/headcount", async (req, res) => {
  try {
    const rows = await q(`
      SELECT d.name AS department, COUNT(e.id) AS headcount
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active' AND e.deleted_at IS NULL
      GROUP BY d.id, d.name
    `);
    return res.json({ type: "Headcount", rows });
  } catch (err) {
    return safeError(res, err, "Failed to generate headcount report.");
  }
});

router.get("/leave-summary", async (req, res) => {
  try {
    const rows = await q(`
      SELECT ${FULL_NAME_SQL} AS full_name, lr.leave_type, lr.start_date, lr.end_date, lr.days_count, lr.status
      FROM leave_requests lr JOIN employees e ON e.id = lr.employee_id
      ORDER BY lr.created_at DESC
    `);
    return res.json({ type: "Leave", rows });
  } catch (err) {
    return safeError(res, err, "Failed to generate leave summary.");
  }
});

router.get("/overtime", async (req, res) => {
  try {
    const parsed = reportMonthSchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const month = parsed.data.month || new Date().toISOString().slice(0, 7);

    const rows = await q(
      `SELECT ${FULL_NAME_SQL} AS full_name, SUM(a.overtime_hours) AS total_overtime
       FROM attendance a JOIN employees e ON e.id = a.employee_id
       WHERE DATE_FORMAT(a.date, '%Y-%m') = :month AND a.overtime_hours > 0
       GROUP BY e.id, e.full_name, e.first_name, e.last_name
       ORDER BY total_overtime DESC`,
      { month }
    );
    return res.json({ type: "Overtime", month, rows });
  } catch (err) {
    return safeError(res, err, "Failed to generate overtime report.");
  }
});

router.get("/timesheet", async (req, res) => {
  try {
    const rows = await q(`
      SELECT ${FULL_NAME_SQL} AS full_name, t.period_start, t.period_end, t.status,
             t.total_regular_hours, t.total_overtime_hours
      FROM timesheets t JOIN employees e ON e.id = t.employee_id
      ORDER BY t.period_start DESC
    `);
    return res.json({ type: "Timesheet", rows });
  } catch (err) {
    return safeError(res, err, "Failed to generate timesheet report.");
  }
});

router.get("/audit-export", async (req, res) => {
  try {
    const rows = await q(`
      SELECT al.action, al.module, al.record_id, al.created_at, u.full_name AS user
      FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC LIMIT 500
    `);
    return res.json({ type: "Audit", rows });
  } catch (err) {
    return safeError(res, err, "Failed to generate audit export.");
  }
});

export default router;