import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { getSettings } from "../settings.js";

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
  // "HH:MM:SS" -> minutes mula 00:00
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// POST /attendance/checkin/me — Employee Portal self check-in
router.post("/checkin/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "Walang naka-link na employee record sa account na ito." });
    }
    const { method } = req.body; // "biometric" | "manual" | "web"
    const employee_id = req.user.employee_id;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS

    const settings = await getSettings([
      "late_threshold_minutes",
      "early_checkin_window_minutes",
      "biometric_required",
    ]);

    // Kung required ang biometric ayon sa settings, dapat "biometric" ang method
    if (settings.biometric_required && method !== "biometric") {
      return res.status(403).json({ error: "Kailangan ng biometric verification para sa check-in ayon sa system settings." });
    }

    // Hanapin ang naka-schedule na shift ng empleyado ngayong araw
    const shiftRows = await q(
      `SELECT s.start_time FROM employee_shifts es JOIN shifts s ON s.id = es.shift_id
       WHERE es.employee_id = :employee_id AND es.date = :today LIMIT 1`,
      { employee_id, today }
    );
    const shiftStart = shiftRows[0]?.start_time ?? null;

    // Alamin kung "late" batay sa shift start + late_threshold_minutes
    let status = "present";
    if (shiftStart) {
      const lateThreshold = settings.late_threshold_minutes ?? 15;
      const shiftMinutes = timeToMinutes(shiftStart);
      const nowMinutes = timeToMinutes(currentTime);
      if (nowMinutes > shiftMinutes + lateThreshold) {
        status = "late";
      }
    }

    // Meron na bang existing attendance record ngayong araw?
    const existing = await q("SELECT id, check_in FROM attendance WHERE employee_id = :employee_id AND date = :today", { employee_id, today });
    if (existing[0]?.check_in) {
      return res.status(409).json({ error: "Nag-check-in ka na ngayong araw." });
    }

    if (existing[0]) {
      await q("UPDATE attendance SET check_in = :check_in, status = :status WHERE id = :id", {
        check_in: currentTime,
        status,
        id: existing[0].id,
      });
    } else {
      await q(
        `INSERT INTO attendance (id, employee_id, date, check_in, status) VALUES (:id, :employee_id, :today, :check_in, :status)`,
        { id: crypto.randomUUID(), employee_id, today, check_in: currentTime, status }
      );
    }

    await q(
      `INSERT INTO attendance_logs (id, employee_id, type, method, ip_address) VALUES (:id, :employee_id, 'check_in', :method, :ip)`,
      { id: crypto.randomUUID(), employee_id, method: method ?? "manual", ip: req.ip }
    );

    res.json({ ok: true, status, check_in: currentTime });
  } catch (err) {
    console.error("POST /attendance/checkin/me error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Check-in failed" });
  }
});

// POST /attendance/checkout/me — Employee Portal self check-out
router.post("/checkout/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "Walang naka-link na employee record sa account na ito." });
    }
    const { method } = req.body;
    const employee_id = req.user.employee_id;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentTime = now.toTimeString().slice(0, 8);

    const settings = await getSettings(["overtime_threshold_hours", "biometric_required"]);

    if (settings.biometric_required && method !== "biometric") {
      return res.status(403).json({ error: "Kailangan ng biometric verification para sa check-out ayon sa system settings." });
    }

    const existing = await q("SELECT id, check_in, check_out FROM attendance WHERE employee_id = :employee_id AND date = :today", { employee_id, today });
    if (!existing[0] || !existing[0].check_in) {
      return res.status(400).json({ error: "Wala ka pang check-in ngayong araw." });
    }
    if (existing[0].check_out) {
      return res.status(409).json({ error: "Nag-check-out ka na ngayong araw." });
    }

    const inMinutes = timeToMinutes(existing[0].check_in);
    const outMinutes = timeToMinutes(currentTime);
    const workHours = Math.max(0, (outMinutes - inMinutes) / 60);
    const overtimeThreshold = settings.overtime_threshold_hours ?? 8;
    const overtimeHours = Math.max(0, workHours - overtimeThreshold);

    await q(
      "UPDATE attendance SET check_out = :check_out, work_hours = :work_hours, overtime_hours = :overtime_hours WHERE id = :id",
      { check_out: currentTime, work_hours: workHours.toFixed(2), overtime_hours: overtimeHours.toFixed(2), id: existing[0].id }
    );

    await q(
      `INSERT INTO attendance_logs (id, employee_id, type, method, ip_address) VALUES (:id, :employee_id, 'check_out', :method, :ip)`,
      { id: crypto.randomUUID(), employee_id, method: method ?? "manual", ip: req.ip }
    );

    res.json({ ok: true, check_out: currentTime, work_hours: workHours.toFixed(2), overtime_hours: overtimeHours.toFixed(2) });
  } catch (err) {
    console.error("POST /attendance/checkout/me error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Check-out failed" });
  }
});

// GET /attendance/me?from=&to=
router.get("/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "Walang naka-link na employee record sa account na ito." });
    }
    const { from, to } = req.query;
    let sql = "SELECT * FROM attendance WHERE employee_id = :employee_id";
    const params = { employee_id: req.user.employee_id };
    if (from && to) {
      sql += " AND date BETWEEN :from AND :to";
      params.from = from;
      params.to = to;
    }
    sql += " ORDER BY date DESC";
    const rows = await q(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /attendance/me error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch your attendance" });
  }
});

// GET /attendance?date=YYYY-MM-DD  o  ?from=...&to=...  — para sa admin
router.get("/", async (req, res) => {
  try {
    const { date, from, to } = req.query;
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
    res.json(rows.map((r) => ({ ...r, employee: JSON.parse(r.employee) })));
  } catch (err) {
    console.error("GET /attendance error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch attendance" });
  }
});

// GET /attendance/stats/monthly-trend
router.get("/stats/monthly-trend", async (req, res) => {
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
    res.json(result);
  } catch (err) {
    console.error("GET /attendance/stats/monthly-trend error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch trend" });
  }
});

export default router;