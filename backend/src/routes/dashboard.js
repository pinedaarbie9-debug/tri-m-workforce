// backend/src/routes/dashboard.js
import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole, safeParseJSON } from "../utils/helpers.js";
import { safeError } from "../utils/errorResponse.js";
import { ROLE_GROUPS } from "../utils/roles.js";

const router = Router();
router.use(requireAuth);
router.use(requireRole(...ROLE_GROUPS.MANAGEMENT));

const one = async (sql) => (await q(sql))[0];

router.get("/stats", async (req, res) => {
  try {
    const { total } = await one("SELECT COUNT(*) AS total FROM employees WHERE deleted_at IS NULL");
    const { newHires } = await one(
      `SELECT COUNT(*) AS "newHires" FROM employees
       WHERE hire_date >= date_trunc('month', CURRENT_DATE)::date AND deleted_at IS NULL`
    );
    const { onLeaveToday } = await one(
      `SELECT COUNT(*) AS "onLeaveToday" FROM leave_requests
       WHERE status = 'approved' AND CURRENT_DATE BETWEEN start_date AND end_date`
    );
    const { pendingLeaves } = await one(
      `SELECT COUNT(*) AS "pendingLeaves" FROM leave_requests WHERE status = 'pending'`
    );
    const { presentToday } = await one(
      `SELECT COUNT(*) AS "presentToday" FROM attendance
       WHERE date = CURRENT_DATE AND status IN ('present','late','half_day')`
    );
    const { monthOvertimeHours } = await one(
      `SELECT COALESCE(SUM(overtime_hours), 0) AS "monthOvertimeHours" FROM attendance
       WHERE date >= date_trunc('month', CURRENT_DATE)::date`
    );
    const { avgWorkHours } = await one(
      `SELECT COALESCE(ROUND(AVG(work_hours)::numeric, 1), 0) AS "avgWorkHours" FROM attendance
       WHERE date = CURRENT_DATE AND work_hours IS NOT NULL`
    );
    const monthlyTrend = await q(`
      SELECT to_char(date, 'Mon') AS month, to_char(date, 'YYYY-MM') AS sort_key,
        COUNT(*) FILTER (WHERE status = 'present') AS present_count,
        COUNT(*) FILTER (WHERE status = 'absent') AS absent_count,
        COUNT(*) FILTER (WHERE status = 'late') AS late_count,
        COUNT(*) AS total
      FROM attendance
      WHERE date >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY 2, 1
      ORDER BY 2 ASC
    `);

    return res.json({
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
  } catch (err) {
    return safeError(res, err, "Failed to fetch dashboard stats.");
  }
});

router.get("/recent-activity", async (req, res) => {
  try {
    const rows = await q(`
      SELECT
        al.*,
        json_build_object(
          'full_name', COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)),
          'avatar_url', e.avatar_url,
          'department', json_build_object('name', d.name)
        ) AS employee
      FROM attendance_logs al
      JOIN employees e ON e.id = al.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE al."timestamp"::date = CURRENT_DATE
      ORDER BY al."timestamp" DESC
      LIMIT 6
    `);
    return res.json(rows.map((r) => ({ ...r, employee: safeParseJSON(r.employee) })));
  } catch (err) {
    return safeError(res, err, "Failed to fetch recent activity.");
  }
});

router.get("/live-punch", async (req, res) => {
  try {
    const rows = await q(`
      SELECT
        al.type, al.method, COALESCE(al.device_id, al.ip_address) AS device_id, al."timestamp",
        e.id AS employee_id,
        COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)) AS full_name,
        e.avatar_url, e.job_title,
        d.name AS department
      FROM attendance_logs al
      JOIN employees e ON e.id = al.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE al.method = 'biometric'
      ORDER BY al."timestamp" DESC
      LIMIT 1
    `);
    return res.json(rows[0] ?? null);
  } catch (err) {
    return safeError(res, err, "Failed to fetch live punch.");
  }
});

router.get("/shift-distribution", async (req, res) => {
  try {
    const rows = await q(`
      SELECT s.type, COUNT(*) AS cnt
      FROM employee_shifts es
      JOIN shifts s ON s.id = es.shift_id
      WHERE es.date = CURRENT_DATE
      GROUP BY s.type
    `);
    const total = rows.reduce((a, r) => a + r.cnt, 0) || 1;
    const palette = { day: "#7c3aed", evening: "#06b6d4", night: "#10b981", rotating: "#f59e0b" };
    return res.json(
      rows.map((r) => ({
        name: `${r.type.charAt(0).toUpperCase()}${r.type.slice(1)} Shift`,
        value: Math.round((r.cnt / total) * 100),
        color: palette[r.type] ?? "#7c3aed",
      }))
    );
  } catch (err) {
    return safeError(res, err, "Failed to fetch shift distribution.");
  }
});

export default router;