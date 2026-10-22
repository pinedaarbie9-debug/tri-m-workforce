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

// Optional filter: ["E033","E072"]. Walang laman/hindi ibinigay = lahat.
function parseCodes(v) {
  if (v === undefined || v === null) return { codes: null };
  if (!Array.isArray(v) || v.length === 0 || v.length > 200 || v.some((c) => typeof c !== "string" || !c.trim())) {
    return { error: "employee_codes must be a non-empty array of strings (max 200)" };
  }
  return { codes: v.map((c) => c.trim()) };
}

// Walang array param: ang db helper (q) ay ginagawang JSON string ang array, kaya
// gumagawa tayo ng IN (:c0, :c1, ...) na may sariling named param bawat code.
function codeFilter(codes, params) {
  if (!codes) return "";
  const names = codes.map((c, i) => {
    params[`c${i}`] = c;
    return `:c${i}`;
  });
  return ` AND e.employee_code IN (${names.join(", ")})`;
}

// attendance.status -> HR4 status. on_leave at holiday ay hindi ipinapadala.
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
// body: { "from":"2026-10-18", "to":"2026-10-22", "employee_codes":["E033"], "dry_run": true }
router.post("/attendance", async (req, res) => {
  try {
    const { from, to, dry_run = true } = req.body || {};
    if (!validRange(from, to)) {
      return res.status(400).json({ error: "from and to required (YYYY-MM-DD), from <= to" });
    }
    const { codes, error: codesError } = parseCodes(req.body?.employee_codes);
    if (codesError) return res.status(400).json({ error: codesError });

    const params = { d1: from, d2: to };
    const codeClause = codeFilter(codes, params);

    // late_minutes: check_in minus start_time ng shift SA ARAW NA IYON (employee_shifts.date = attendance.date),
    // para sa status='late' lang. Parehong lookup ng check-in sa attendance.js.
    const rows = await q(
      `SELECT e.employee_code AS code,
              to_char(a.date, 'YYYY-MM-DD') AS d,
              a.status AS st,
              a.check_out IS NULL AS no_out,
              a.work_hours AS hrs,
              a.overtime_hours AS ot,
              CASE WHEN a.status = 'late' THEN COALESCE((
                SELECT GREATEST(0, ROUND(EXTRACT(EPOCH FROM (a.check_in - s.start_time)) / 60))
                  FROM employee_shifts es
                  JOIN shifts s ON s.id = es.shift_id
                 WHERE es.employee_id = a.employee_id AND es.date = a.date
                 LIMIT 1
              ), 0) ELSE 0 END AS late
         FROM attendance a
         JOIN employees e ON e.id = a.employee_id
        WHERE a.date BETWEEN :d1 AND :d2
          ${codeClause}
        ORDER BY a.date, e.employee_code`,
      params
    );

    const logs = [];
    const warnings = [];
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
      const log = {
        employee_id: hr4EmpId(r.code),
        log_date: r.d,
        status: st,
        actual_hours: num(r.hrs),
        ot_hours: num(r.ot),
        nd_hours: 0,        // walang night-diff source; hindi pa rin binabayaran ng HR4
        holiday_hours: 0,   // walang holiday source sa HR2
        late_minutes: Math.round(num(r.late)), // raw, walang grace period
      };
      logs.push(log);

      // Mga kahina-hinalang row na dapat tingnan bago ang totoong send
      const w = [];
      if (r.no_out) w.push("no_check_out");
      if (st === "P" && log.actual_hours < 1) w.push("under_1_hour");
      if (log.actual_hours > 16) w.push("over_16_hours");
      if (log.ot_hours > 4) w.push("ot_over_4_hours");
      if (w.length) warnings.push({ employee_id: log.employee_id, log_date: log.log_date, flags: w });
    }

    if (dry_run !== false) {
      return res.json({
        dry_run: true,
        count: logs.length,
        skipped,
        warnings,
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
    res.json({ dry_run: false, count: logs.length, skipped, warnings, results });
  } catch (err) {
    console.error("hr4-sync attendance:", err.message);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ---------- POST /api/hr4-sync/leaves ----------
// INSERT-only sa HR4: ISANG BESES lang bawat leave. Magdodoble kapag inulit.
// body: { "from","to", "employee_codes":[...], "only_completed": true, "dry_run": true }
// only_completed (default TRUE): leave na tapos na lang (end_date bago ang ngayon, oras ng Manila).
router.post("/leaves", async (req, res) => {
  try {
    const { from, to, dry_run = true, only_completed = true } = req.body || {};
    if (!validRange(from, to)) {
      return res.status(400).json({ error: "from and to required (YYYY-MM-DD), from <= to" });
    }
    const { codes, error: codesError } = parseCodes(req.body?.employee_codes);
    if (codesError) return res.status(400).json({ error: codesError });

    const params = { d1: from, d2: to };
    let extra = codeFilter(codes, params);
    if (only_completed !== false) {
      extra += " AND lr.end_date < (now() AT TIME ZONE 'Asia/Manila')::date";
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
          ${extra}
        ORDER BY lr.start_date, e.employee_code`,
      params
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
        only_completed: only_completed !== false,
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