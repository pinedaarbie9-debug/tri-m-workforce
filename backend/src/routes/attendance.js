// backend/src/routes/attendance.js
import { Router } from "express";
import crypto from "node:crypto";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { safeParseJSON, getZodError } from "../utils/helpers.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import { getSettings } from "../settings.js";
import { ROLE_GROUPS } from "../utils/roles.js";
import {
  checkInSchema,
  attendanceQuerySchema,
} from "../validators/businessValidator.js";

const router = Router();
router.use(requireAuth);

const SELECT_ATTENDANCE = `
  SELECT
    a.*,
    JSON_OBJECT(
      'id', e.id,
      'full_name', COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)),
      'employee_code', e.employee_code,
      'avatar_url', e.avatar_url,
      'department', JSON_OBJECT('name', d.name)
    ) AS employee
  FROM attendance a
  JOIN employees e ON e.id = a.employee_id
  LEFT JOIN departments d ON d.id = e.department_id
`;

function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// POST /attendance/checkin/me
router.post("/checkin/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "No linked employee record." });
    }
    const parsed = checkInSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { method } = parsed.data;

    const employee_id = req.user.employee_id;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentTime = now.toTimeString().slice(0, 8);

    const settings = await getSettings([
      "late_threshold_minutes",
      "early_checkin_window_minutes",
      "biometric_required",
    ]);

    if (settings.biometric_required && method !== "biometric") {
      return res.status(403).json({
        error: "Biometric verification required for check-in.",
      });
    }

    const shiftRows = await q(
      `SELECT s.start_time FROM employee_shifts es JOIN shifts s ON s.id = es.shift_id
       WHERE es.employee_id = :employee_id AND es.date = :today LIMIT 1`,
      { employee_id, today }
    );
    const shiftStart = shiftRows[0]?.start_time ?? null;

    let status = "present";
    if (shiftStart) {
      const lateThreshold = settings.late_threshold_minutes ?? 15;
      const shiftMinutes = timeToMinutes(shiftStart);
      const nowMinutes = timeToMinutes(currentTime);
      if (nowMinutes > shiftMinutes + lateThreshold) {
        status = "late";
      }
    }

    const existing = await q(
      "SELECT id, check_in FROM attendance WHERE employee_id = :employee_id AND date = :today",
      { employee_id, today }
    );
    if (existing[0]?.check_in) {
      return res.status(409).json({ error: "You have already checked in today." });
    }

    if (existing[0]) {
      await q(
        "UPDATE attendance SET check_in = :check_in, status = :status WHERE id = :id",
        { check_in: currentTime, status, id: existing[0].id }
      );
    } else {
      await q(
        `INSERT INTO attendance (id, employee_id, date, check_in, status) VALUES (:id, :employee_id, :today, :check_in, :status)`,
        {
          id: crypto.randomUUID(),
          employee_id,
          today,
          check_in: currentTime,
          status,
        }
      );
    }

    await q(
      `INSERT INTO attendance_logs (id, employee_id, type, method, ip_address) VALUES (:id, :employee_id, 'check_in', :method, :ip)`,
      {
        id: crypto.randomUUID(),
        employee_id,
        method: method ?? "manual",
        ip: req.ip,
      }
    );

    return res.json({ ok: true, status, check_in: currentTime });
  } catch (err) {
    return safeError(res, err, "Check-in failed.");
  }
});

// POST /attendance/checkout/me
router.post("/checkout/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "No linked employee record." });
    }
    const parsed = checkInSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { method } = parsed.data;

    const employee_id = req.user.employee_id;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentTime = now.toTimeString().slice(0, 8);

    const settings = await getSettings([
      "overtime_threshold_hours",
      "biometric_required",
    ]);

    if (settings.biometric_required && method !== "biometric") {
      return res.status(403).json({
        error: "Biometric verification required for check-out.",
      });
    }

    const existing = await q(
      "SELECT id, check_in, check_out FROM attendance WHERE employee_id = :employee_id AND date = :today",
      { employee_id, today }
    );
    if (!existing[0] || !existing[0].check_in) {
      return validationError(res, "You have not checked in today.");
    }
    if (existing[0].check_out) {
      return res.status(409).json({ error: "You have already checked out today." });
    }

    const inMinutes = timeToMinutes(existing[0].check_in);
    const outMinutes = timeToMinutes(currentTime);
    const workHours = Math.max(0, (outMinutes - inMinutes) / 60);
    const overtimeThreshold = settings.overtime_threshold_hours ?? 8;
    const overtimeHours = Math.max(0, workHours - overtimeThreshold);

    await q(
      "UPDATE attendance SET check_out = :check_out, work_hours = :work_hours, overtime_hours = :overtime_hours WHERE id = :id",
      {
        check_out: currentTime,
        work_hours: workHours.toFixed(2),
        overtime_hours: overtimeHours.toFixed(2),
        id: existing[0].id,
      }
    );

    await q(
      `INSERT INTO attendance_logs (id, employee_id, type, method, ip_address) VALUES (:id, :employee_id, 'check_out', :method, :ip)`,
      {
        id: crypto.randomUUID(),
        employee_id,
        method: method ?? "manual",
        ip: req.ip,
      }
    );

    return res.json({
      ok: true,
      check_out: currentTime,
      work_hours: workHours.toFixed(2),
      overtime_hours: overtimeHours.toFixed(2),
    });
  } catch (err) {
    return safeError(res, err, "Check-out failed.");
  }
});

// GET /attendance/me
router.get("/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "No linked employee record." });
    }
    const parsed = attendanceQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { from, to } = parsed.data;

    let sql = "SELECT * FROM attendance WHERE employee_id = :employee_id";
    const params = { employee_id: req.user.employee_id };
    if (from && to) {
      sql += " AND date BETWEEN :from AND :to";
      params.from = from;
      params.to = to;
    }
    sql += " ORDER BY date DESC";
    const rows = await q(sql, params);
    return res.json(rows);
  } catch (err) {
    return safeError(res, err, "Failed to fetch your attendance.");
  }
});

// GET /attendance — MANAGEMENT
router.get(
  "/",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const parsed = attendanceQuerySchema.safeParse(req.query);
      if (!parsed.success) return validationError(res, getZodError(parsed));
      const { date, from, to } = parsed.data;

      let sql = SELECT_ATTENDANCE;
      const params = {};
      if (date) {
        sql += " WHERE a.date = :date";
        params.date = date;
      } else if (from && to) {
        sql += " WHERE a.date BETWEEN :from AND :to";
        params.from = from;
        params.to = to;
      }
      sql += " ORDER BY a.created_at DESC";
      const rows = await q(sql, params);
      return res.json(
        rows.map((r) => ({ ...r, employee: safeParseJSON(r.employee) }))
      );
    } catch (err) {
      return safeError(res, err, "Failed to fetch attendance.");
    }
  }
);

// GET /attendance/stats/monthly-trend — MANAGEMENT
router.get(
  "/stats/monthly-trend",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const rows = await q(`
        SELECT
          DATE_FORMAT(date, '%b') AS month,
          DATE_FORMAT(date, '%Y-%m') AS sort_key,
          SUM(status = 'present') AS present_count,
          SUM(status = 'absent') AS absent_count,
          SUM(status = 'late') AS late_count,
          COUNT(*) AS total
        FROM attendance
        WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY sort_key, month
        ORDER BY sort_key ASC
      `);
      const result = rows.map((r) => ({
        month: r.month,
        present: r.total ? Math.round((r.present_count / r.total) * 100) : 0,
        absent: r.total ? Math.round((r.absent_count / r.total) * 100) : 0,
        late: r.total ? Math.round((r.late_count / r.total) * 100) : 0,
      }));
      return res.json(result);
    } catch (err) {
      return safeError(res, err, "Failed to fetch trend.");
    }
  }
);

export default router;