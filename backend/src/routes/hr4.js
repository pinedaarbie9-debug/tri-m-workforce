// backend/src/routes/hr4Sync.js
// HR2 -> HR4 (Payroll & Benefits): PUSH ng attendance at approved leave papunta sa HR4.
// Admin-only. DRY-RUN bilang default: walang ipinapadala hangga't hindi {"dry_run": false}.
//
//   POST /api/hr4-sync/attendance   { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "dry_run": true }
//   POST /api/hr4-sync/leaves       { "from": "...", "to": "...", "dry_run": true }
//
// Env (HostForge Environment Variables, HUWAG sa code/repo):
//   HR4_BASE_URL = https://payrollandbenefits-backend.onrender.com
//   HR4_API_KEY  = (ang key na ibinigay ng HR4: hr2-workforce / workforce:write)
//
// Mapping sa HR4 (POST /api/integration/attendance at /api/integration/leave):
//   employee_id = "hris-" + employee_code (E075 -> hris-E075)
//   attendance: log_date, status (P/H/A/OT), actual_hours, ot_hours, nd_hours, holiday_hours (0), late_minutes
//   leave: leave_type, start_date, end_date, days, is_paid (hinuha mula sa leave_type), status "Approved"
// BABALA: ang /leave ng HR4 ay INSERT-only (walang dedupe) -> isang beses lang ipadala ang bawat range.
import { Router } from "express";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { safeError } from "../utils/errorResponse.js";
import { ROLE_GROUPS } from "../utils/roles.js";

const router = Router();
router.use(requireAuth);
router.use(requireRole(...ROLE_GROUPS.ADMIN_ONLY));

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
const pad = (n) => String(n).padStart(2, "0");
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const todayManila = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

function parseRange(req) {
  const from = String(req.query.from ?? "");
  const to = String(req.query.to ?? "");
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return { error: "from and to are required (YYYY-MM-DD)." };
  if (from > to) return { error: "from must not be after to." };
  const days = (Date.parse(to) - Date.parse(from)) / 86400000;
  if (days > 92) return { error: "Maximum range is 93 days." };
  return { from, to };
}
const lit = (d) => {
  if (!DATE_RE.test(d)) throw new Error(`Invalid date: ${d}`);
  return `'${d}'`;
};

// "HH:MM[:SS]" -> minuto
function toMin(t) {
  if (!t) return null;
  const [h, m, s] = String(t).split(":").map(Number);
  return h * 60 + (m || 0) + (s || 0) / 60;
}
const round2 = (n) => Math.round(n * 100) / 100;

// Minuto ng overlap ng [a,b] sa [c,d]
const overlap = (a, b, c, d) => Math.max(0, Math.min(b, d) - Math.max(a, c));

// Night differential 22:00-06:00 sa trabahong [start, end] (minuto; end>start; hanggang 48h)
function nightDiffHours(startMin, endMin) {
  if (startMin === null || endMin === null) return 0;
  let e = endMin;
  if (e <= startMin) e += 1440;
  const windows = [
    [0, 360],
    [1320, 1800],
    [2760, 3240],
  ];
  const mins = windows.reduce((n, [c, d]) => n + overlap(startMin, e, c, d), 0);
  return round2(mins / 60);
}

// Late / undertime / scheduled minutes laban sa shift (kasama ang overnight)
function measure(shift, checkIn, checkOut) {
  if (!shift || !shift.start || !shift.end) return { late: 0, under: 0, scheduled: null };
  const s = toMin(shift.start);
  let e = toMin(shift.end);
  if (e <= s) e += 1440;
  const brk = Number(shift.break_duration ?? 0) || 0;
  const scheduled = Math.max(0, e - s - brk);
  let ci = toMin(checkIn);
  let late = 0;
  let under = 0;
  if (ci !== null) {
    if (ci < s - 720) ci += 1440;
    late = Math.max(0, Math.round(ci - s));
  }
  if (ci !== null && checkOut) {
    let co = toMin(checkOut);
    if (co < ci) co += 1440;
    under = Math.max(0, Math.round(e - co));
  }
  return { late, under, scheduled };
}

const isUnpaid = (type) => /unpaid|without\s*pay|lwop/i.test(String(type ?? ""));

const NOT_TEST = `COALESCE(a.notes, '') NOT ILIKE 'TEST DATA%'`;

// ---------------------------------------------------------------
// Data loaders
// ---------------------------------------------------------------
async function loadShifts(from, to) {
  return q(
    `SELECT e.employee_code AS employee_id,
            TO_CHAR(es.date, 'YYYY-MM-DD') AS date,
            s.code AS shift_code, s.name AS shift_name,
            TO_CHAR(s.start_time, 'HH24:MI:SS') AS start_time,
            TO_CHAR(s.end_time, 'HH24:MI:SS') AS end_time,
            s.break_duration
     FROM employee_shifts es
     JOIN employees e ON e.id = es.employee_id AND e.deleted_at IS NULL
     JOIN shifts s ON s.id = es.shift_id
     WHERE es.date >= ${lit(from)} AND es.date <= ${lit(to)}
     ORDER BY e.employee_code, es.date`
  );
}

async function loadAttendance(from, to) {
  return q(
    `SELECT e.employee_code AS employee_id,
            TO_CHAR(a.date, 'YYYY-MM-DD') AS date,
            TO_CHAR(a.check_in, 'HH24:MI:SS') AS check_in,
            TO_CHAR(a.check_out, 'HH24:MI:SS') AS check_out,
            a.status AS hr2_status, a.work_hours, a.overtime_hours
     FROM attendance a
     JOIN employees e ON e.id = a.employee_id AND e.deleted_at IS NULL
     WHERE a.date >= ${lit(from)} AND a.date <= ${lit(to)} AND ${NOT_TEST}
     ORDER BY e.employee_code, a.date`
  );
}

async function loadLeaves(from, to, status) {
  const statusSql = status ? `AND LOWER(lr.status) = LOWER('${String(status).replace(/[^a-zA-Z_ -]/g, "")}')` : "";
  return q(
    `SELECT e.employee_code AS employee_id, lr.leave_type,
            TO_CHAR(lr.start_date, 'YYYY-MM-DD') AS start_date,
            TO_CHAR(lr.end_date, 'YYYY-MM-DD') AS end_date,
            lr.days_count AS days, lr.status, lr.reference_id
     FROM leave_requests lr
     JOIN employees e ON e.id = lr.employee_id AND e.deleted_at IS NULL
     WHERE lr.end_date >= ${lit(from)} AND lr.start_date <= ${lit(to)} ${statusSql}
     ORDER BY e.employee_code, lr.start_date`
  );
}

// Pinagsamang daily logs (attendance + shift + approved leave)
async function buildDaily(from, to) {
  const [shifts, atts, leaves] = await Promise.all([
    loadShifts(from, to),
    loadAttendance(from, to),
    loadLeaves(from, to, "approved"),
  ]);
  const today = todayManila();
  const key = (e, d) => `${e}|${d}`;
  const shiftMap = new Map(shifts.map((s) => [key(s.employee_id, s.date), s]));
  const attMap = new Map(atts.map((a) => [key(a.employee_id, a.date), a]));

  const onLeave = (emp, date) =>
    leaves.some((l) => l.employee_id === emp && l.start_date <= date && l.end_date >= date);

  const keys = new Set([...shiftMap.keys(), ...attMap.keys()]);
  const rows = [];
  for (const k of keys) {
    const sh = shiftMap.get(k);
    const at = attMap.get(k);
    const [emp, date] = k.split("|");
    const shift = sh ? { start: sh.start_time, end: sh.end_time, break_duration: sh.break_duration } : null;

    if (!at) {
      // Naka-schedule pero walang punch
      if (date >= today || onLeave(emp, date)) continue;
      rows.push({
        employee_id: emp, log_date: date, status: "A", check_in: null, check_out: null,
        work_hours: 0, ot_hours: 0, late_minutes: 0, undertime_minutes: 0, night_diff_hours: 0,
        shift_code: sh?.shift_code ?? null,
      });
      continue;
    }

    const m = measure(shift, at.check_in, at.check_out);
    const work = Number(at.work_hours ?? 0);
    const ot = Number(at.overtime_hours ?? 0);
    let status = "P";
    if (ot > 0) status = "OT";
    else if (m.scheduled && at.check_out && work * 60 < m.scheduled / 2) status = "H";

    rows.push({
      employee_id: emp,
      log_date: date,
      status,
      check_in: at.check_in,
      check_out: at.check_out,
      work_hours: round2(work),
      ot_hours: round2(ot),
      late_minutes: m.late,
      undertime_minutes: m.under,
      night_diff_hours: at.check_in && at.check_out ? nightDiffHours(toMin(at.check_in), toMin(at.check_out)) : 0,
      shift_code: sh?.shift_code ?? null,
    });
  }
  rows.sort((a, b) => (a.employee_id + a.log_date).localeCompare(b.employee_id + b.log_date, undefined, { numeric: true }));
  return rows;
}

// ---------------------------------------------------------------
// Push sa HR4
// ---------------------------------------------------------------
const hrId = (code) => `hris-${code}`;

async function postHr4(path, body) {
  const base = process.env.HR4_BASE_URL;
  const key = process.env.HR4_API_KEY;
  if (!base || !key) {
    const e = new Error("HR4_BASE_URL / HR4_API_KEY is not configured.");
    e.status = 503;
    throw e;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const resp = await fetch(`${base.replace(/\/+$/, "")}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    let json = null;
    try { json = await resp.json(); } catch { /* walang JSON */ }
    return { status: resp.status, ok: resp.ok, body: json };
  } finally {
    clearTimeout(timer);
  }
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// Ang request ng HR4 ay all-or-nothing? Hindi alam: kaya bawat batch (100) ay hiwalay at iniuulat ang resulta.
async function pushBatches(path, key, items) {
  const results = [];
  for (const part of chunk(items, 100)) {
    try {
      const r = await postHr4(path, { [key]: part });
      results.push({ sent: part.length, http: r.status, ok: r.ok, response: r.body });
      if (!r.ok) break; // huwag nang ituloy kapag may error (401/403/422)
    } catch (err) {
      results.push({ sent: part.length, ok: false, error: err.message });
      break;
    }
  }
  return results;
}

function parseBody(req) {
  const from = String(req.body?.from ?? "");
  const to = String(req.body?.to ?? "");
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return { error: "from and to are required (YYYY-MM-DD)." };
  if (from > to) return { error: "from must not be after to." };
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 31) return { error: "Maximum range is 32 days (isang cut-off)." };
  const dry = req.body?.dry_run !== false; // dry-run maliban kung tahasang false
  return { from, to, dry };
}

router.post("/attendance", async (req, res) => {
  try {
    const p = parseBody(req);
    if (p.error) return res.status(400).json({ success: false, error: p.error });
    const rows = await buildDaily(p.from, p.to);
    const logs = rows.map((d) => ({
      employee_id: hrId(d.employee_id),
      log_date: d.log_date,
      status: d.status,
      actual_hours: d.work_hours,
      ot_hours: d.ot_hours,
      nd_hours: d.night_diff_hours,
      holiday_hours: 0,
      late_minutes: d.late_minutes,
    }));
    if (p.dry) {
      return res.json({ success: true, dry_run: true, count: logs.length, sample: logs.slice(0, 10), note: "Walang ipinadala. Idagdag ang \"dry_run\": false para ipadala." });
    }
    const results = await pushBatches("/api/integration/attendance", "logs", logs);
    return res.json({ success: results.every((r) => r.ok), dry_run: false, count: logs.length, results });
  } catch (err) {
    return safeError(res, err, "Failed to sync attendance to HR4.");
  }
});

router.post("/leaves", async (req, res) => {
  try {
    const p = parseBody(req);
    if (p.error) return res.status(400).json({ success: false, error: p.error });
    const rows = await loadLeaves(p.from, p.to, "approved");
    const requests = rows.map((l) => ({
      employee_id: hrId(l.employee_id),
      leave_type: l.leave_type,
      start_date: l.start_date,
      end_date: l.end_date,
      days: Number(l.days ?? 0),
      is_paid: !isUnpaid(l.leave_type),
      status: "Approved",
    }));
    if (p.dry) {
      return res.json({ success: true, dry_run: true, count: requests.length, requests, note: "Walang ipinadala. Ang HR4 /leave ay INSERT-only: isang beses lang i-send ang bawat leave." });
    }
    const results = await pushBatches("/api/integration/leave", "requests", requests);
    return res.json({ success: results.every((r) => r.ok), dry_run: false, count: requests.length, results });
  } catch (err) {
    return safeError(res, err, "Failed to sync leaves to HR4.");
  }
});

export default router;