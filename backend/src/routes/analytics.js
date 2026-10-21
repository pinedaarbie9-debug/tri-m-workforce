// backend/src/routes/analytics.js
// GET /api/analytics?period=quarter|half|year
// Totoong data mula sa employees, departments, attendance, employee_shifts at leave_requests.
//
// Mga depinisyon:
//  - Attendance rate = (naka-schedule na araw na may check-in) / (naka-schedule na araw na tapos na),
//    hindi kasama ang araw na may approved leave, ang araw ngayon, at ang mga row na "TEST DATA".
//  - Avg hours/week = average ng lingguhang total ng work_hours bawat empleyado.
//  - Turnover = (terminated + inactive + deleted) / lahat ng empleyado. Walang petsa ng pag-alis sa DB,
//    kaya hindi ito nakadepende sa napiling period.
import { Router } from "express";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { safeError } from "../utils/errorResponse.js";
import { ROLE_GROUPS } from "../utils/roles.js";

const router = Router();
router.use(requireAuth);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// Petsa ngayon sa Asia/Manila (yyyy-mm-dd), hindi sa timezone ng server
function todayManila() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
// Ligtas isama sa SQL: server-generated ang petsa at vine-validate pa rin ang format
function lit(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`Invalid date: ${d}`);
  return `'${d}'`;
}
const litDate = (d) => `CAST(${lit(d)} AS date)`;

function periodRange(period, today) {
  const [y, m] = today.split("-").map(Number);
  let startM, len, label;
  if (period === "half") {
    startM = m <= 6 ? 1 : 7;
    len = 6;
    label = `H${m <= 6 ? 1 : 2}`;
  } else if (period === "year") {
    startM = 1;
    len = 12;
    label = String(y);
  } else {
    startM = Math.floor((m - 1) / 3) * 3 + 1;
    len = 3;
    label = `Q${Math.floor((m - 1) / 3) + 1}`;
  }
  const endM = startM + len - 1;
  const from = ymd(y, startM, 1);
  const fullTo = ymd(y, endM, lastDay(y, endM));
  const to = fullTo < today ? fullTo : today;

  // Nakaraang period na pareho ang haba
  let py = y;
  let pStart = startM - len;
  while (pStart < 1) {
    pStart += 12;
    py -= 1;
  }
  const pEnd = pStart + len - 1;
  return {
    label,
    from,
    to,
    prev_from: ymd(py, pStart, 1),
    prev_to: ymd(py, pEnd, lastDay(py, pEnd)),
    text: `${MONTHS[startM - 1]} 1 – ${MONTHS[endM - 1]} ${lastDay(y, endM)}, ${y}`,
  };
}

// Mga buwan (yyyy-mm) mula from hanggang to
function monthsBetween(from, to) {
  const out = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push({ ym: `${y}-${pad(m)}`, label: MONTHS[m - 1] });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

const NOT_TEST = `COALESCE(a.notes, '') NOT ILIKE 'TEST DATA%'`;

// Attendance rate ng isang range (tapos nang mga araw lang)
async function attendanceRows(from, to, today) {
  const closedTo = addDays(today, -1); // hindi pa tapos ang araw ngayon
  const end = to < closedTo ? to : closedTo;
  if (end < from) return [];
  return q(
    `SELECT TO_CHAR(es.date, 'YYYY-MM') AS ym,
            COUNT(*) AS scheduled,
            COUNT(*) FILTER (WHERE EXISTS (
              SELECT 1 FROM attendance a
              WHERE a.employee_id = es.employee_id AND a.date = es.date
                AND a.check_in IS NOT NULL AND ${NOT_TEST}
            )) AS attended
     FROM employee_shifts es
     JOIN employees e ON e.id = es.employee_id AND e.deleted_at IS NULL
     WHERE es.date >= ${lit(from)} AND es.date <= ${lit(end)}
       AND NOT EXISTS (
         SELECT 1 FROM leave_requests lr
         WHERE lr.employee_id = es.employee_id AND lr.status = 'approved'
           AND es.date >= lr.start_date AND es.date <= lr.end_date
       )
     GROUP BY 1
     ORDER BY 1`
  );
}

function overallRate(rows) {
  const scheduled = rows.reduce((n, r) => n + Number(r.scheduled), 0);
  const attended = rows.reduce((n, r) => n + Number(r.attended), 0);
  return scheduled > 0 ? (attended / scheduled) * 100 : null;
}

async function avgHoursPerWeek(from, to) {
  const rows = await q(
    `SELECT AVG(t.hrs) AS avg_hrs FROM (
       SELECT a.employee_id, DATE_TRUNC('week', a.date) AS wk, SUM(a.work_hours) AS hrs
       FROM attendance a
       JOIN employees e ON e.id = a.employee_id AND e.deleted_at IS NULL
       WHERE a.date >= ${lit(from)} AND a.date <= ${lit(to)}
         AND a.check_out IS NOT NULL AND ${NOT_TEST}
       GROUP BY a.employee_id, DATE_TRUNC('week', a.date)
     ) t`
  );
  const v = rows[0]?.avg_hrs;
  return v === null || v === undefined ? null : Number(v);
}

const round1 = (n) => (n === null || n === undefined || Number.isNaN(n) ? null : Math.round(n * 10) / 10);

router.get("/", requireRole(...ROLE_GROUPS.EMPLOYEE_MANAGERS), async (req, res) => {
  try {
    const period = ["quarter", "half", "year"].includes(req.query.period) ? req.query.period : "quarter";
    const today = todayManila();
    const r = periodRange(period, today);

    const [
      deptRows,
      tenureRows,
      turnoverRows,
      attRows,
      prevAttRows,
      hours,
      prevHours,
      otRows,
      leaveRows,
    ] = await Promise.all([
      // Headcount ng aktibong empleyado bawat department
      q(
        `SELECT COALESCE(d.name, 'Unassigned') AS dept, COUNT(*) AS count
         FROM employees e
         LEFT JOIN departments d ON d.id = e.department_id
         WHERE e.deleted_at IS NULL AND e.status IN ('active', 'on_leave')
         GROUP BY COALESCE(d.name, 'Unassigned')
         ORDER BY COUNT(*) DESC, 1`
      ),
      // Avg tenure ng aktibong empleyado, sa taon
      q(
        `SELECT AVG(GREATEST(CURRENT_DATE - CAST(e.hire_date AS date), 0)) / 365.25 AS yrs,
                COUNT(*) AS active
         FROM employees e
         WHERE e.deleted_at IS NULL AND e.status IN ('active', 'on_leave') AND e.hire_date IS NOT NULL`
      ),
      q(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE e.deleted_at IS NOT NULL OR e.status IN ('terminated', 'inactive')) AS separated
         FROM employees e`
      ),
      attendanceRows(r.from, r.to, today),
      attendanceRows(r.prev_from, r.prev_to, today),
      avgHoursPerWeek(r.from, r.to),
      avgHoursPerWeek(r.prev_from, r.prev_to),
      q(
        `SELECT TO_CHAR(DATE_TRUNC('week', a.date), 'YYYY-MM-DD') AS wk, SUM(a.overtime_hours) AS hrs
         FROM attendance a
         JOIN employees e ON e.id = a.employee_id AND e.deleted_at IS NULL
         WHERE a.date >= ${lit(r.from)} AND a.date <= ${lit(r.to)} AND ${NOT_TEST}
         GROUP BY DATE_TRUNC('week', a.date)
         ORDER BY DATE_TRUNC('week', a.date)`
      ),
      // Approved leave na tumatama sa period, sa bilang ng araw
      q(
        `SELECT lr.leave_type AS name,
                COUNT(*) AS requests,
                SUM(LEAST(CAST(lr.end_date AS date), ${litDate(r.to)}) - GREATEST(CAST(lr.start_date AS date), ${litDate(r.from)}) + 1) AS days
         FROM leave_requests lr
         JOIN employees e ON e.id = lr.employee_id AND e.deleted_at IS NULL
         WHERE lr.status = 'approved'
           AND lr.end_date >= ${lit(r.from)} AND lr.start_date <= ${lit(r.to)}
         GROUP BY lr.leave_type
         ORDER BY 3 DESC`
      ),
    ]);

    // Buwan-buwan na attendance rate (may null kapag walang schedule sa buwang iyon)
    const byYm = Object.fromEntries(attRows.map((x) => [x.ym, x]));
    const attendance_by_month = monthsBetween(r.from, r.to).map((m) => {
      const row = byYm[m.ym];
      const scheduled = row ? Number(row.scheduled) : 0;
      const attended = row ? Number(row.attended) : 0;
      return {
        month: m.label,
        rate: scheduled > 0 ? round1((attended / scheduled) * 100) : null,
        scheduled,
        attended,
      };
    });

    const attendance_rate = round1(overallRate(attRows));
    const attendance_rate_prev = round1(overallRate(prevAttRows));
    const avg_hours_week = round1(hours);
    const avg_hours_week_prev = round1(prevHours);

    const total = Number(turnoverRows[0]?.total ?? 0);
    const separated = Number(turnoverRows[0]?.separated ?? 0);

    // Huling 12 linggo lang para mabasa
    const overtime_trend = otRows.slice(-12).map((x) => {
      const [, m, d] = x.wk.split("-").map(Number);
      return { week: `${MONTHS[m - 1]} ${d}`, hours: round1(Number(x.hrs ?? 0)) ?? 0 };
    });

    return res.json({
      period,
      label: r.label,
      range_text: r.text,
      from: r.from,
      to: r.to,
      kpis: {
        avg_tenure_years: round1(Number(tenureRows[0]?.yrs ?? 0)),
        active_employees: Number(tenureRows[0]?.active ?? 0),
        total_employees: total,
        separated_employees: separated,
        turnover_rate: total > 0 ? round1((separated / total) * 100) : 0,
        avg_hours_week,
        avg_hours_week_prev,
        attendance_rate,
        attendance_rate_prev,
      },
      headcount_by_dept: deptRows.map((x) => ({ dept: x.dept, count: Number(x.count) })),
      attendance_by_month,
      leave_distribution: leaveRows.map((x) => ({
        name: x.name,
        value: Number(x.days ?? 0),
        requests: Number(x.requests ?? 0),
      })),
      overtime_trend,
    });
  } catch (err) {
    return safeError(res, err, "Failed to load analytics.");
  }
});

export default router;