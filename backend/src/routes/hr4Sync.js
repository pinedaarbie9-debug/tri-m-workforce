// backend/src/routes/hr4Sync.js
// HR2 (Workforce) -> HR4 (Payroll) push. Admin only. DRY-RUN by default.
import { Router } from "express";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLE_GROUPS } from "../utils/roles.js";

const router = Router();
router.use(requireAuth, requireRole(...ROLE_GROUPS.ADMIN_ONLY));

const HR4_BASE_URL = (process.env.HR4_BASE_URL || "").replace(/\/+$/, "");
const HR4_API_KEY = process.env.HR4_API_KEY || "";

// employees.employee_code -> hris-<code>. Kumpirmahin kay Eljohn kung lowercase ang number part.
const hr4EmpId = (code) => `hris-${String(code).trim()}`;

const num = (n) => Number(n) || 0;
const validDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "");
const validRange = (from, to) => validDate(from) && validDate(to) && from <= to;

// attendance.status -> HR4 status. on_leave at holiday ay hindi ipinapadala (tingnan sa ibaba).
const STATUS_MAP = {
  present: "P",
  late: "P",
  half_day: "H",
  absent: "A",
};

const LEAVE_LABELS = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  unpaid: "Unpaid Leave",
  emergency: "Emergency Leave",
  compensatory: "Compensatory Leave",
  service_incentive: "Service Incentive Leave",
  solo_parent: "Solo Parent Leave",
  vawc: "VAWC Leave",
  special_women: "Special Leave for Women",
};

async function pushToHr4(path, body) {
  if (!HR4_BASE_URL || !HR4_API_KEY) {
    const e = new Error("HR4_BASE_URL / HR4_API_KEY not set");
    e.status = 503;
    throw e;
  }
  const res = await fetch(`${HR4_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": HR4_API_KEY },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

// ---------- POST /api/hr4-sync/attendance ----------
// body: { "from":"2026-10-18", "to":"2026-10-22", "dry_run": true }
router.post("/attendance", async (req, res) => {
  try {
    const { from, to, dry_run = true } = req.body || {};
    if (!validRange(from, to)) {
      return res.status(400).json({ error: "from and to required (YYYY-MM-DD), from <= to" });
    }

    // late_minutes: check_in minus shift start_time, para sa mga status='late' lang.
    // (Walang late_minutes column sa attendance, kaya kinukuwenta rito.)
    const rows = await q(
      `SELECT e.employee_code AS code,
              to_char(a.date, 'YYYY-MM-DD') AS d,
              a.status AS st,
              a.work_hours AS hrs,
              a.overtime_hours AS ot,
              CASE WHEN a.status = 'late' THEN COALESCE((
                SELECT GREATEST(0, ROUND(EXTRACT(EPOCH FROM (a.check_in - s.start_time)) / 60))
                  FROM employee_shifts es
                  JOIN shifts s ON s.id = es.shift_id
                 WHERE es.employee_id = a.employee_id
                 LIMIT 1
              ), 0) ELSE 0 END AS late
         FROM attendance a
         JOIN employees e ON e.id = a.employee_id
        WHERE a.date BETWEEN :d1 AND :d2
        ORDER BY a.date, e.employee_code`,
      { d1: from, d2: to }
    );

    const logs = [];
    const skipped = { on_leave: 0, holiday: 0, other: 0, no_code: 0 };
    for (const r of rows) {
      if (!r.code) { skipped.no_code++; continue; }
      const st = STATUS_MAP[r.st];
      if (!st) {
        if (r.st === "on_leave") skipped.on_leave++;
        else if (r.st === "holiday") skipped.holiday++;
        else skipped.other++;
        continue;
      }
      logs.push({
        employee_id: hr4EmpId(r.code),
        log_date: r.d,
        status: st,
        actual_hours: num(r.hrs),
        ot_hours: num(r.ot),
        nd_hours: 0,        // walang night-diff source; hindi pa rin binabayaran ng HR4
        holiday_hours: 0,   // walang holiday source sa HR2
        late_minutes: Math.round(num(r.late)), // raw, walang grace period
      });
    }

    if (dry_run !== false) {
      return res.json({
        dry_run: true,
        count: logs.length,
        skipped,
        late_rows: logs.filter((l) => l.late_minutes > 0),
        sample: logs.slice(0, 20),
        would_send_to: `${HR4_BASE_URL}/api/integration/attendance`,
      });
    }

    const results = [];
    for (let i = 0; i < logs.length; i += 200) {
      const r = await pushToHr4("/api/integration/attendance", { logs: logs.slice(i, i + 200) });
      results.push({ batch: i / 200 + 1, status: r.status, response: r.data });
      if (!r.ok) break; // upsert sa HR4, kaya safe i-resend
    }
    res.json({ dry_run: false, count: logs.length, skipped, results });
  } catch (err) {
    console.error("hr4-sync attendance:", err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ---------- POST /api/hr4-sync/leaves ----------
// INSERT-only sa HR4: ISANG BESES lang bawat range. Magdodoble kapag inulit.
router.post("/leaves", async (req, res) => {
  try {
    const { from, to, dry_run = true } = req.body || {};
    if (!validRange(from, to)) {
      return res.status(400).json({ error: "from and to required (YYYY-MM-DD), from <= to" });
    }

    const rows = await q(
      `SELECT e.employee_code AS code,
              lr.leave_type AS lt,
              to_char(lr.start_date, 'YYYY-MM-DD') AS sd,
              to_char(lr.end_date, 'YYYY-MM-DD') AS ed,
              lr.days_count AS days
         FROM leave_requests lr
         JOIN employees e ON e.id = lr.employee_id
        WHERE lr.status = 'approved'
          AND lr.start_date <= :d2 AND lr.end_date >= :d1
        ORDER BY lr.start_date, e.employee_code`,
      { d1: from, d2: to }
    );

    const requests = rows
      .filter((r) => r.code)
      .map((r) => ({
        employee_id: hr4EmpId(r.code),
        leave_type: LEAVE_LABELS[r.lt] || r.lt,
        start_date: r.sd,
        end_date: r.ed,
        days: num(r.days),
        is_paid: r.lt !== "unpaid",
        status: "Approved",
      }));

    if (dry_run !== false) {
      return res.json({
        dry_run: true,
        count: requests.length,
        requests,
        would_send_to: `${HR4_BASE_URL}/api/integration/leave`,
      });
    }

    const r = await pushToHr4("/api/integration/leave", { requests });
    res.status(r.ok ? 200 : 502).json({ dry_run: false, count: requests.length, status: r.status, response: r.data });
  } catch (err) {
    console.error("hr4-sync leaves:", err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;