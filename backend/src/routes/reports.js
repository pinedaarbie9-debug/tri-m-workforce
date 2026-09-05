import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /reports/summary — real counts for the top banner
router.get("/summary", async (req, res) => {
  try {
    const checks = await Promise.all([
      q("SELECT COUNT(*) AS c FROM attendance"),
      q("SELECT COUNT(*) AS c FROM employees"),
      q("SELECT COUNT(*) AS c FROM leave_requests"),
      q("SELECT COUNT(*) AS c FROM timesheets"),
      q("SELECT COUNT(*) AS c FROM attendance WHERE overtime_hours > 0"),
      q("SELECT COUNT(*) AS c FROM audit_logs"),
    ]);
    const hasData = checks.map(([row]) => row.c > 0);
    res.json({
      totalReports: 6,
      ready: hasData.filter(Boolean).length,
    });
  } catch (err) {
    console.error("reports/summary error:", err);
    res.status(500).json({ error: "Failed to load reports summary" });
  }
});

// GET /reports/attendance-summary?month=2026-08
router.get("/attendance-summary", async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const rows = await q(
      `SELECT e.full_name, a.date, a.status, a.check_in, a.check_out, a.work_hours, a.overtime_hours
       FROM attendance a JOIN employees e ON e.id = a.employee_id
       WHERE DATE_FORMAT(a.date, '%Y-%m') = ?
       ORDER BY a.date DESC`,
      [month]
    );
    res.json({ type: "Attendance", month, rows });
  } catch (err) {
    console.error("reports/attendance-summary error:", err);
    res.status(500).json({ error: "Failed to generate attendance summary" });
  }
});

// GET /reports/headcount
router.get("/headcount", async (req, res) => {
  try {
    const rows = await q(`
      SELECT d.name AS department, COUNT(e.id) AS headcount
      FROM departments d LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'active'
      GROUP BY d.id, d.name
    `);
    res.json({ type: "Headcount", rows });
  } catch (err) {
    console.error("reports/headcount error:", err);
    res.status(500).json({ error: "Failed to generate headcount report" });
  }
});

// GET /reports/leave-summary
router.get("/leave-summary", async (req, res) => {
  try {
    const rows = await q(`
      SELECT e.full_name, lr.leave_type, lr.start_date, lr.end_date, lr.days_count, lr.status
      FROM leave_requests lr JOIN employees e ON e.id = lr.employee_id
      ORDER BY lr.created_at DESC
    `);
    res.json({ type: "Leave", rows });
  } catch (err) {
    console.error("reports/leave-summary error:", err);
    res.status(500).json({ error: "Failed to generate leave summary" });
  }
});

// GET /reports/overtime?month=2026-08
router.get("/overtime", async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const rows = await q(
      `SELECT e.full_name, SUM(a.overtime_hours) AS total_overtime
       FROM attendance a JOIN employees e ON e.id = a.employee_id
       WHERE DATE_FORMAT(a.date, '%Y-%m') = ? AND a.overtime_hours > 0
       GROUP BY e.id, e.full_name ORDER BY total_overtime DESC`,
      [month]
    );
    res.json({ type: "Overtime", month, rows });
  } catch (err) {
    console.error("reports/overtime error:", err);
    res.status(500).json({ error: "Failed to generate overtime report" });
  }
});

// GET /reports/timesheet
router.get("/timesheet", async (req, res) => {
  try {
    const rows = await q(`
      SELECT e.full_name, t.period_start, t.period_end, t.status,
             t.total_regular_hours, t.total_overtime_hours
      FROM timesheets t JOIN employees e ON e.id = t.employee_id
      ORDER BY t.period_start DESC
    `);
    res.json({ type: "Timesheet", rows });
  } catch (err) {
    console.error("reports/timesheet error:", err);
    res.status(500).json({ error: "Failed to generate timesheet report" });
  }
});

// GET /reports/audit-export
router.get("/audit-export", async (req, res) => {
  try {
    const rows = await q(`
      SELECT al.action, al.module, al.record_id, al.created_at, u.full_name AS user
      FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC LIMIT 500
    `);
    res.json({ type: "Audit", rows });
  } catch (err) {
    console.error("reports/audit-export error:", err);
    res.status(500).json({ error: "Failed to generate audit export" });
  }
});

export default router;