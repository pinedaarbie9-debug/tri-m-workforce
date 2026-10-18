// backend/src/routes/hr3.js
import crypto from "node:crypto";
import { Router } from "express";
import { q } from "../db.js";
import { safeError } from "../utils/errorResponse.js";
import {
  trainingTableReady,
  refreshTrainingIfStale,
  upsertTrainingSessions,
  startHr3TrainingSync,
} from "../services/hr3Training.js";

const router = Router();

// Simulan ang background pull ng training sessions galing HR3 (isang beses lang).
startHr3TrainingSync();

if (process.env.HR3_API_KEY && process.env.HR3_API_KEY.length < 32) {
  console.warn("⚠️ HR3_API_KEY is shorter than 32 characters. Generate a longer random key.");
}

// ============================================================
// 🔒 API Key check para kay HR3 (constant-time compare)
// ============================================================
const digest = (value) => crypto.createHash("sha256").update(String(value)).digest();

function requireHr3ApiKey(req, res, next) {
  const expected = process.env.HR3_API_KEY;

  if (!expected) {
    console.error("❌ HR3_API_KEY is not configured in .env");
    return res.status(500).json({ success: false, error: "HR3 API not configured." });
  }

  const key = req.headers["x-api-key"];
  if (!key || !crypto.timingSafeEqual(digest(key), digest(expected))) {
    return res.status(401).json({ success: false, error: "Invalid or missing API key." });
  }

  next();
}

router.use(requireHr3ApiKey);

// ============================================================
// Helpers
// ============================================================
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;
const LEAVE_STATUSES = ["pending", "approved", "rejected", "cancelled"];

function badRequest(res, message) {
  return res.status(400).json({ success: false, error: message, message });
}

// Returns { from, to } o { error }
function parseRange(query) {
  const from = typeof query.from === "string" ? query.from.trim() : "";
  const to = typeof query.to === "string" ? query.to.trim() : "";

  if (!DATE_RE.test(from) || !DATE_RE.test(to) || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    return { error: "'from' and 'to' are required in YYYY-MM-DD format." };
  }
  if (from > to) return { error: "'from' must not be after 'to'." };
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > MAX_RANGE_DAYS) {
    return { error: `Date range is limited to ${MAX_RANGE_DAYS} days.` };
  }
  return { from, to };
}

// ============================================================
// GET /api/hr3/attendance-summary?from=&to=
//
// absences    = araw na "absent" na HINDI sakop ng approved leave at HINDI sakop ng training
// leave_days  = bilang ng araw ng APPROVED leave sa loob ng range (hiwalay na field)
// training_days = bilang ng araw na may scheduled training (galing HR3) sa loob ng range
// ============================================================
router.get("/attendance-summary", async (req, res) => {
  try {
    const range = parseRange(req.query);
    if (range.error) return badRequest(res, range.error);
    const { from, to } = range;

    // Kunin muna ang pinakabagong trainings mula HR3 (hindi nagta-throw; cache ang gagamitin kung pumalya)
    await refreshTrainingIfStale(from, to);
    const hasTraining = await trainingTableReady();

    // Bawat named param ay isang beses lang ginagamit (iba-ibang pangalan) para ligtas sa q() helper.
    const params = {
      att_from: from,
      att_to: to,
      lv_from1: from,
      lv_to1: to,
      lv_from2: from,
      lv_to2: to,
    };

    const inTrainingExpr = hasTraining
      ? `EXISTS (
           SELECT 1 FROM hr3_training_sessions t
           WHERE t.employee_code = UPPER(e.employee_code) AND t.date = a.date
         )`
      : "FALSE";

    let trainSumSql = `SELECT CAST(NULL AS text) AS code, CAST(0 AS bigint) AS training_days WHERE FALSE`;
    if (hasTraining) {
      trainSumSql = `
        SELECT t.employee_code AS code, COUNT(DISTINCT t.date) AS training_days
        FROM hr3_training_sessions t
        WHERE t.date BETWEEN CAST(:tr_from AS date) AND CAST(:tr_to AS date)
        GROUP BY t.employee_code`;
      params.tr_from = from;
      params.tr_to = to;
    }

    const rows = await q(
      `
      WITH att AS (
        SELECT
          a.employee_id,
          a.status,
          a.overtime_hours,
          EXISTS (
            SELECT 1 FROM leave_requests l
            WHERE l.employee_id = a.employee_id
              AND l.status = 'approved'
              AND a.date BETWEEN CAST(l.start_date AS date) AND CAST(l.end_date AS date)
          ) AS on_leave,
          ${inTrainingExpr} AS in_training
        FROM attendance a
        JOIN employees e ON e.id = a.employee_id
        WHERE a.date BETWEEN CAST(:att_from AS date) AND CAST(:att_to AS date)
      ),
      leave_sum AS (
        SELECT
          l.employee_id,
          SUM(
            GREATEST(
              0,
              LEAST(CAST(l.end_date AS date), CAST(:lv_to1 AS date))
                - GREATEST(CAST(l.start_date AS date), CAST(:lv_from1 AS date)) + 1
            )
          ) AS leave_days
        FROM leave_requests l
        WHERE l.status = 'approved'
          AND CAST(l.start_date AS date) <= CAST(:lv_to2 AS date)
          AND CAST(l.end_date AS date) >= CAST(:lv_from2 AS date)
        GROUP BY l.employee_id
      ),
      train_sum AS (
        ${trainSumSql}
      )
      SELECT
        e.employee_code AS employee_id,
        COUNT(*) FILTER (WHERE att.status = 'present') AS days_present,
        COUNT(*) FILTER (WHERE att.status = 'absent' AND NOT att.on_leave AND NOT att.in_training) AS absences,
        COUNT(*) FILTER (WHERE att.status = 'late') AS lates,
        COUNT(*) FILTER (WHERE att.status = 'late') * 15 AS late_minutes,
        COALESCE(SUM(att.overtime_hours), 0) AS undertime_minutes, -- Simplified (dating logic), adjust if needed
        COALESCE(MAX(ls.leave_days), 0) AS leave_days,
        COALESCE(MAX(ts.training_days), 0) AS training_days
      FROM employees e
      LEFT JOIN att ON att.employee_id = e.id
      LEFT JOIN leave_sum ls ON ls.employee_id = e.id
      LEFT JOIN train_sum ts ON ts.code = UPPER(e.employee_code)
      GROUP BY e.employee_code
      ORDER BY e.employee_code
      `,
      params
    );

    const data = rows.map((r) => ({
      employee_id: r.employee_id,
      days_present: Number(r.days_present),
      absences: Number(r.absences),
      lates: Number(r.lates),
      late_minutes: Number(r.late_minutes),
      undertime_minutes: Number(r.undertime_minutes),
      leave_days: Number(r.leave_days),
      training_days: Number(r.training_days),
    }));

    return res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, "Failed to fetch attendance summary.");
  }
});

// ============================================================
// GET /api/hr3/leaves?from=&to=&status=
// Lahat ng leave na NAG-OOVERLAP sa range (hindi lang yung buong nasa loob ng range).
// ============================================================
router.get("/leaves", async (req, res) => {
  try {
    const range = parseRange(req.query);
    if (range.error) return badRequest(res, range.error);
    const { from, to } = range;

    const params = { from_date: from, to_date: to };
    let statusSql = "";

    if (req.query.status !== undefined && req.query.status !== "") {
      const status = String(req.query.status).trim().toLowerCase();
      if (!LEAVE_STATUSES.includes(status)) {
        return badRequest(res, `Invalid status. Accepted: ${LEAVE_STATUSES.join(", ")}.`);
      }
      statusSql = " AND l.status = :status";
      params.status = status;
    }

    const rows = await q(
      `
      SELECT
        e.employee_code AS employee_id,
        l.leave_type,
        to_char(CAST(l.start_date AS date), 'YYYY-MM-DD') AS start_date,
        to_char(CAST(l.end_date AS date), 'YYYY-MM-DD') AS end_date,
        l.days_count,
        l.status
      FROM leave_requests l
      JOIN employees e ON e.id = l.employee_id
      WHERE CAST(l.start_date AS date) <= CAST(:to_date AS date)
        AND CAST(l.end_date AS date) >= CAST(:from_date AS date)
        ${statusSql}
      ORDER BY l.start_date DESC
      `,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    return safeError(res, err, "Failed to fetch leaves.");
  }
});

// ============================================================
// GET /api/hr3/schedules?from=&to=
// ============================================================
router.get("/schedules", async (req, res) => {
  try {
    const range = parseRange(req.query);
    if (range.error) return badRequest(res, range.error);
    const { from, to } = range;

    const rows = await q(
      `
      SELECT
        e.employee_code AS employee_id,
        to_char(CAST(es.date AS date), 'YYYY-MM-DD') AS date,
        s.start_time AS shift_start,
        s.end_time AS shift_end
      FROM employee_shifts es
      JOIN employees e ON e.id = es.employee_id
      JOIN shifts s ON s.id = es.shift_id
      WHERE es.date BETWEEN CAST(:from_date AS date) AND CAST(:to_date AS date)
      ORDER BY es.date ASC
      `,
      { from_date: from, to_date: to }
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    return safeError(res, err, "Failed to fetch schedules.");
  }
});

// ============================================================
// POST /api/hr3/training-sessions
// (Opsyonal: kung ang HR3 mismo ang mag-push ng trainings. Ang normal na daloy ay HR2 ang
//  nagpu-pull mula sa HR3 gamit ang services/hr3Training.js.)
// Hindi na ito nagpapalit ng attendance status; ang summary at late logic na ang gumagamit
// ng training data.
// ============================================================
router.post("/training-sessions", async (req, res) => {
  try {
    const data = req.body?.data;
    if (!Array.isArray(data)) {
      return badRequest(res, "Invalid payload. Expected { data: [...] }.");
    }
    if (!(await trainingTableReady())) {
      return res.status(503).json({
        success: false,
        error: "Table hr3_training_sessions does not exist. Run the HR3 training migration first.",
      });
    }

    const { saved, errors } = await upsertTrainingSessions(data, new Date().toISOString());
    const status = errors.length === 0 ? 200 : saved === 0 ? 422 : 207;

    return res.status(status).json({
      success: errors.length === 0,
      message: "Training sessions processed.",
      saved,
      errors: errors.length > 0 ? errors : "None",
    });
  } catch (err) {
    return safeError(res, err, "Failed to process training sessions.");
  }
});

export default router;