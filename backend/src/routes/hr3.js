// backend/src/routes/hr3.js
import { Router } from "express";
import { q } from "../db.js";
import { safeError } from "../utils/errorResponse.js";

const router = Router();

// ============================================================
// 🔒 API Key check para kay HR3
// ============================================================
function requireHr3ApiKey(req, res, next) {
  const key = req.headers["x-api-key"];
  const expected = process.env.HR3_API_KEY;

  if (!expected) {
    console.error("❌ HR3_API_KEY is not configured in .env");
    return res.status(500).json({ error: "HR3 API not configured." });
  }

  if (!key || key !== expected) {
    return res.status(401).json({ error: "Invalid or missing API key." });
  }

  next();
}

router.use(requireHr3ApiKey);

// ============================================================
// Helper: Hanapin ang employee by employee_id (flexible)
// ============================================================
async function findEmployeeByPartnerId(partnerId) {
  let result = await q("SELECT id FROM employees WHERE employee_code = :id", { id: String(partnerId) });
  if (result.length > 0) return result[0];

  result = await q("SELECT id FROM employees WHERE employee_code = :id", { id: `E${partnerId}` });
  if (result.length > 0) return result[0];

  return null;
}

// ============================================================
// GET /api/hr3/attendance-summary?from=&to=
// ============================================================
router.get("/attendance-summary", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: "Missing 'from' or 'to' query params." });

    // Query para sa summary per employee
    const rows = await q(`
      SELECT 
        e.employee_code AS employee_id,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) AS days_present,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) AS absences,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) AS lates,
        COALESCE(SUM(CASE WHEN a.status = 'late' THEN 15 ELSE 0 END), 0) AS late_minutes,
        COALESCE(SUM(a.overtime_hours), 0) AS undertime_minutes -- Simplified, adjust if needed
      FROM employees e
      LEFT JOIN attendance a ON a.employee_id = e.id AND a.date BETWEEN :from AND :to
      GROUP BY e.employee_code
      ORDER BY e.employee_code
    `, { from, to });

    return res.json({ data: rows });
  } catch (err) {
    return safeError(res, err, "Failed to fetch attendance summary.");
  }
});

// ============================================================
// GET /api/hr3/leaves?from=&to=&status=
// ============================================================
router.get("/leaves", async (req, res) => {
  try {
    const { from, to, status } = req.query;
    if (!from || !to) return res.status(400).json({ error: "Missing 'from' or 'to' query params." });

    let sql = `
      SELECT 
        e.employee_code AS employee_id,
        l.leave_type,
        l.start_date,
        l.end_date,
        l.status
      FROM leave_requests l
      JOIN employees e ON e.id = l.employee_id
      WHERE l.start_date >= :from AND l.end_date <= :to
    `;
    const params = { from, to };

    if (status) {
      sql += " AND l.status = :status";
      params.status = status.toLowerCase();
    }

    sql += " ORDER BY l.start_date DESC";
    const rows = await q(sql, params);
    return res.json({ data: rows });
  } catch (err) {
    return safeError(res, err, "Failed to fetch leaves.");
  }
});

// ============================================================
// GET /api/hr3/schedules?from=&to=
// ============================================================
router.get("/schedules", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: "Missing 'from' or 'to' query params." });

    const rows = await q(`
      SELECT 
        e.employee_code AS employee_id,
        es.date,
        s.start_time AS shift_start,
        s.end_time AS shift_end
      FROM employee_shifts es
      JOIN employees e ON e.id = es.employee_id
      JOIN shifts s ON s.id = es.shift_id
      WHERE es.date BETWEEN :from AND :to
      ORDER BY es.date ASC
    `, { from, to });

    return res.json({ data: rows });
  } catch (err) {
    return safeError(res, err, "Failed to fetch schedules.");
  }
});

// ============================================================
// POST /api/hr3/training-sessions
// (Tumatanggap ng training data from HR3)
// ============================================================
router.post("/training-sessions", async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: "Invalid payload. Expected { data: [...] }." });
    }

    let savedCount = 0;
    let errors = [];

    for (const session of data) {
      try {
        const employee = await findEmployeeByPartnerId(session.employee_id);
        if (!employee) throw new Error(`Employee ${session.employee_id} not found.`);

        // 1. Save sa training_sessions table
        await q(`
          INSERT INTO training_sessions (employee_id, training_title, date, start_time, end_time)
          VALUES (:employee_id, :training_title, :date, :start_time, :end_time)
        `, {
          employee_id: employee.id,
          training_title: session.training_title,
          date: session.date,
          start_time: session.start_time,
          end_time: session.end_time
        });

        // 2. Mark attendance as 'training' para hindi mabilang na absent
        await q(`
          INSERT INTO attendance (employee_id, date, status, notes)
          VALUES (:employee_id, :date, 'training', :notes)
          ON CONFLICT (employee_id, date) DO UPDATE SET
            status = 'training',
            notes = :notes
        `, {
          employee_id: employee.id,
          date: session.date,
          notes: `Training: ${session.training_title}`
        });

        savedCount++;
      } catch (err) {
        console.error(`❌ Error saving training for ${session.employee_id}:`, err.message);
        errors.push({ employee_id: session.employee_id, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Training sessions processed.",
      saved: savedCount,
      errors: errors.length > 0 ? errors : "None"
    });
  } catch (err) {
    return safeError(res, err, "Failed to process training sessions.");
  }
});

export default router;