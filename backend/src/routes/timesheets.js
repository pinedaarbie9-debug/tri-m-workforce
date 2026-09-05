import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /timesheets — admin view: lahat ng timesheets, may employee info
router.get("/", async (req, res) => {
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
    res.json(rows);
  } catch (err) {
    console.error("GET /timesheets error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch timesheets" });
  }
});

// GET /timesheets/me — sariling timesheets ng naka-login na empleyado
router.get("/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "Walang naka-link na employee record sa account na ito." });
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
    res.json(rows);
  } catch (err) {
    console.error("GET /timesheets/me error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch timesheets" });
  }
});

// POST /timesheets/generate — bumuo ng timesheet mula sa totoong attendance records
router.post("/generate", async (req, res) => {
  try {
    const { employee_id, period_start, period_end } = req.body;
    if (!employee_id || !period_start || !period_end) {
      return res.status(400).json({ error: "Kailangan ng employee, period_start, at period_end." });
    }

    // Kunin ang lahat ng attendance records ng employee sa loob ng period
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
      return res.status(400).json({ error: "Walang attendance record sa loob ng period na ito." });
    }

    const totalRegular = attendanceRows.reduce((sum, r) => sum + Number(r.work_hours ?? 0), 0);
    const totalOvertime = attendanceRows.reduce((sum, r) => sum + Number(r.overtime_hours ?? 0), 0);
    const entries = JSON.stringify(attendanceRows);

    const id = crypto.randomUUID();
    await q(
      `
      INSERT INTO timesheets (id, employee_id, period_start, period_end, status, total_regular_hours, total_overtime_hours, entries)
      VALUES (:id, :employee_id, :period_start, :period_end, 'draft', :total_regular, :total_overtime, :entries)
      `,
      { id, employee_id, period_start, period_end, total_regular: totalRegular, total_overtime: totalOvertime, entries }
    );

    res.status(201).json({ id, total_regular_hours: totalRegular, total_overtime_hours: totalOvertime });
  } catch (err) {
    console.error("POST /timesheets/generate error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to generate timesheet" });
  }
});

// POST /timesheets/:id/submit — i-submit ang sariling draft timesheet
router.post("/:id/submit", async (req, res) => {
  try {
    const rows = await q("SELECT employee_id, status FROM timesheets WHERE id = :id", { id: req.params.id });
    if (!rows[0]) return res.status(404).json({ error: "Timesheet not found" });
    if (rows[0].employee_id !== req.user.employee_id) {
      return res.status(403).json({ error: "Hindi mo pwedeng i-submit ang timesheet ng iba." });
    }
    if (rows[0].status !== "draft") {
      return res.status(400).json({ error: "Naka-submit na o na-decide na ang timesheet na ito." });
    }
    await q(
      "UPDATE timesheets SET status = 'submitted', submitted_at = NOW() WHERE id = :id",
      { id: req.params.id }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /timesheets/:id/submit error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to submit timesheet" });
  }
});

// PATCH /timesheets/:id/status — admin/supervisor: approve o reject
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'." });
    }
    await q(
      "UPDATE timesheets SET status = :status, approved_at = NOW(), approver_id = :approver_id WHERE id = :id",
      { status, approver_id: req.user.id, id: req.params.id }
    );
    await q(
      "INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'update','timesheets',:rid,:ip)",
      { uid: req.user.id, rid: req.params.id, ip: req.ip }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /timesheets/:id/status error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to update timesheet status" });
  }
});

export default router;