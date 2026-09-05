import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /dashboard/stats
router.get("/stats", async (req, res) => {
  const [[{ total }]] = [await q("SELECT COUNT(*) AS total FROM employees")];
  const [[{ newHires }]] = [await q(
    "SELECT COUNT(*) AS newHires FROM employees WHERE hire_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')"
  )];
  const [[{ onLeaveToday }]] = [await q(
    "SELECT COUNT(*) AS onLeaveToday FROM leave_requests WHERE status='approved' AND CURDATE() BETWEEN start_date AND end_date"
  )];
  const [[{ pendingLeaves }]] = [await q(
    "SELECT COUNT(*) AS pendingLeaves FROM leave_requests WHERE status='pending'"
  )];
  const [[{ presentToday }]] = [await q(
    "SELECT COUNT(*) AS presentToday FROM attendance WHERE date = CURDATE() AND status IN ('present','late','half_day')"
  )];
  const [[{ monthOvertimeHours }]] = [await q(
    `SELECT COALESCE(SUM(overtime_hours),0) AS monthOvertimeHours FROM attendance
     WHERE date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
  )];
  const [[{ avgWorkHours }]] = [await q(
    `SELECT COALESCE(ROUND(AVG(work_hours),1),0) AS avgWorkHours FROM attendance
     WHERE date = CURDATE() AND work_hours IS NOT NULL`
  )];
  const monthlyTrend = await q(`
    SELECT DATE_FORMAT(date, '%b') AS month, DATE_FORMAT(date, '%Y-%m') AS sort_key,
      SUM(status='present') AS present_count, SUM(status='absent') AS absent_count,
      SUM(status='late') AS late_count, COUNT(*) AS total
    FROM attendance WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY sort_key, month ORDER BY sort_key ASC
  `);

  res.json({
    totalEmployees: total,
    newHires,
    onLeaveToday,
    pendingLeaves,
    presentToday,
    monthOvertimeHours: Number(monthOvertimeHours),
    avgWorkHours: Number(avgWorkHours),
    attendanceRate: total > 0 ? Math.round((presentToday / total) * 100) : 0,
    monthlyTrend: monthlyTrend.map((r) => ({
      month: r.month,
      present: r.total ? Math.round((r.present_count / r.total) * 100) : 0,
      absent: r.total ? Math.round((r.absent_count / r.total) * 100) : 0,
      late: r.total ? Math.round((r.late_count / r.total) * 100) : 0,
    })),
  });
});

// GET /dashboard/recent-activity
// FIX: gumagamit na ng COALESCE(NULLIF(full_name, ''), CONCAT(first_name, ' ', last_name))
// para hindi blangko ang pangalan sa Recent Activity kahit blangko ang
// full_name column ng employee sa database (hal. mga test employee na
// first_name/last_name lang ang laman).
router.get("/recent-activity", async (req, res) => {
  const rows = await q(`
    SELECT
      al.*,
      JSON_OBJECT(
        'full_name', COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)),
        'avatar_url', e.avatar_url,
        'department', JSON_OBJECT('name', d.name)
      ) AS employee
    FROM attendance_logs al
    JOIN employees e ON e.id = al.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    ORDER BY al.timestamp DESC
    LIMIT 6
  `);
  res.json(rows.map((r) => ({ ...r, employee: JSON.parse(r.employee) })));
});

// GET /dashboard/live-punch
// Ibinabalik ang PINAKA-HULING fingerprint scan (method = 'biometric'),
// kasama ang litrato ng empleyado. Gamitin ito sa isang "Live Punch" widget
// sa Dashboard na nagpo-poll (hal. every 3-5 seconds) para agad na
// lumabas ang litrato pagkatapos mag-fingerprint ang isang empleyado sa kiosk.
router.get("/live-punch", async (req, res) => {
  const rows = await q(`
    SELECT
      al.type, al.method, al.device_id, al.timestamp,
      e.id AS employee_id,
      COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)) AS full_name,
      e.avatar_url, e.job_title,
      d.name AS department
    FROM attendance_logs al
    JOIN employees e ON e.id = al.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE al.method = 'biometric'
    ORDER BY al.timestamp DESC
    LIMIT 1
  `);
  res.json(rows[0] ?? null);
});

// GET /dashboard/shift-distribution
router.get("/shift-distribution", async (req, res) => {
  const rows = await q(`
    SELECT s.type, COUNT(*) AS cnt
    FROM employee_shifts es
    JOIN shifts s ON s.id = es.shift_id
    WHERE es.date = CURDATE()
    GROUP BY s.type
  `);
  const total = rows.reduce((a, r) => a + r.cnt, 0) || 1;
  const palette = { day: "#7c3aed", evening: "#06b6d4", night: "#10b981", rotating: "#f59e0b" };
  res.json(
    rows.map((r) => ({
      name: `${r.type.charAt(0).toUpperCase()}${r.type.slice(1)} Shift`,
      value: Math.round((r.cnt / total) * 100),
      color: palette[r.type] ?? "#7c3aed",
    }))
  );
});

export default router;