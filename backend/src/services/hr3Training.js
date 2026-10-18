// backend/src/services/hr3Training.js
// HR2 ang tumatawag sa HR3 (GET .../training-sessions.php) para malaman kung sinong empleyado
// ang nasa scheduled training, para hindi sila ma-mark na absent / late sa oras na iyon.
import crypto from "node:crypto";
import { q } from "../db.js";

const DEFAULT_BASE_URL = "https://performance.mms-tmglt.com/api/integration/hr2";
const TZ = process.env.APP_TIMEZONE ?? "Asia/Manila";

const FETCH_TIMEOUT_MS = 8000;
const STALE_MS = 10 * 60 * 1000; // huwag ulitin ang pull sa parehong range sa loob ng 10 min
const RETRY_AFTER_FAIL_MS = 60 * 1000;
const JOB_INTERVAL_MS = 15 * 60 * 1000;
const JOB_PAST_DAYS = 35;
const JOB_FUTURE_DAYS = 14;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

const dayOffset = (n) =>
  new Date(Date.now() + n * 86400000).toLocaleDateString("en-CA", { timeZone: TZ });

// ------------------------------------------------------------
// Table check (para hindi masira ang punch / summary kung hindi pa na-run ang migration)
// ------------------------------------------------------------
let tableOk = false;
let tableCheckedAt = 0;

export async function trainingTableReady() {
  if (tableOk) return true;
  if (Date.now() - tableCheckedAt < 60_000) return false;
  tableCheckedAt = Date.now();
  try {
    const rows = await q("SELECT CAST(to_regclass('hr3_training_sessions') AS text) AS t");
    tableOk = Boolean(rows[0]?.t);
  } catch {
    tableOk = false;
  }
  return tableOk;
}

// ------------------------------------------------------------
// Validation + upsert
// ------------------------------------------------------------
function validateSession(row) {
  const code = row?.employee_id == null ? "" : String(row.employee_id).trim().toUpperCase();
  if (!code) return { error: "employee_id is required." };

  const date = String(row?.date ?? "").trim().slice(0, 10);
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) return { error: "date must be YYYY-MM-DD." };

  const start = TIME_RE.exec(String(row?.start_time ?? "").trim());
  const end = TIME_RE.exec(String(row?.end_time ?? "").trim());
  if (!start || !end) return { error: "start_time and end_time must be HH:mm." };

  const startTime = `${start[1]}:${start[2]}`;
  const endTime = `${end[1]}:${end[2]}`;
  if (endTime <= startTime) return { error: "end_time must be after start_time." };

  const title = String(row?.training_title ?? "").trim().slice(0, 255) || "Training";

  return {
    value: { employee_code: code, training_title: title, date, start_time: startTime, end_time: endTime },
  };
}

/**
 * I-save (upsert) ang listahan ng training sessions. Hindi nagta-throw.
 * @returns {{ saved: number, errors: Array<{ index: number, employee_id: any, error: string }> }}
 */
export async function upsertTrainingSessions(rows, syncedAt) {
  let saved = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const check = validateSession(rows[i]);
    if (check.error) {
      errors.push({ index: i, employee_id: rows[i]?.employee_id ?? null, error: check.error });
      continue;
    }
    try {
      await q(
        `INSERT INTO hr3_training_sessions
           (id, employee_code, training_title, date, start_time, end_time, synced_at)
         VALUES
           (:id, :employee_code, :training_title, :date, :start_time, :end_time, :synced_at)
         ON CONFLICT (employee_code, training_title, date, start_time)
         DO UPDATE SET end_time = EXCLUDED.end_time, synced_at = EXCLUDED.synced_at`,
        { id: crypto.randomUUID(), ...check.value, synced_at: syncedAt }
      );
      saved++;
    } catch (err) {
      errors.push({ index: i, employee_id: rows[i]?.employee_id ?? null, error: err.message });
    }
  }

  return { saved, errors };
}

// ------------------------------------------------------------
// Pull from HR3
// ------------------------------------------------------------
/**
 * GET {HR3_BASE_URL}/training-sessions.php?from=&to= at i-save sa local table.
 * Hindi nagta-throw; laging nagbabalik ng { ok, ... }.
 */
export async function pullTrainingSessions(from, to) {
  const apiKey = process.env.HR3_OUTBOUND_API_KEY;
  if (!apiKey) return { ok: false, error: "HR3_OUTBOUND_API_KEY is not configured in .env" };

  if (!(await trainingTableReady())) {
    return { ok: false, error: "Table hr3_training_sessions does not exist. Run the HR3 training migration first." };
  }

  const base = (process.env.HR3_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const url = new URL(`${base}/training-sessions.php`);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      signal: controller.signal,
    });
    const text = await response.text();

    if (!response.ok) {
      return { ok: false, error: `HR3 responded ${response.status}: ${text.slice(0, 200)}` };
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: "HR3 returned a non-JSON response." };
    }
    if (!json || json.success !== true || !Array.isArray(json.data)) {
      return { ok: false, error: `Unexpected HR3 response: ${text.slice(0, 200)}` };
    }

    const syncedAt = new Date().toISOString();
    const { saved, errors } = await upsertTrainingSessions(json.data, syncedAt);

    // Ang mga na-cancel sa HR3 (wala na sa listahan) ay tatanggalin din dito, sa loob lang ng range.
    await q(
      `DELETE FROM hr3_training_sessions
       WHERE date BETWEEN :from AND :to AND synced_at < :synced_at`,
      { from, to, synced_at: syncedAt }
    );

    return { ok: true, fetched: json.data.length, saved, skipped: errors.length, errors };
  } catch (err) {
    return {
      ok: false,
      error: err.name === "AbortError" ? "HR3 request timed out." : `HR3 request failed: ${err.message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------
// Lazy refresh (ginagamit ng attendance-summary at ng punch flow)
// ------------------------------------------------------------
const lastPull = new Map(); // "from|to" -> timestamp ng huling pull
const inflight = new Map(); // "from|to" -> Promise

/** Hindi nagta-throw. Kapag pumalya ang HR3, gagamitin lang ang cache. */
export async function refreshTrainingIfStale(from, to) {
  try {
    if (!process.env.HR3_OUTBOUND_API_KEY) return;
    if (lastPull.size > 200) lastPull.clear();

    const key = `${from}|${to}`;
    if (Date.now() - (lastPull.get(key) ?? 0) < STALE_MS) return;

    let promise = inflight.get(key);
    if (!promise) {
      promise = pullTrainingSessions(from, to)
        .then((result) => {
          lastPull.set(key, result.ok ? Date.now() : Date.now() - STALE_MS + RETRY_AFTER_FAIL_MS);
          if (!result.ok) console.warn("⚠️ HR3 training refresh failed:", result.error);
          return result;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, promise);
    }
    await promise;
  } catch (err) {
    console.warn("⚠️ HR3 training refresh error:", err.message);
  }
}

// ------------------------------------------------------------
// Background job: pull tuwing 15 minuto (nagsisimula ~20s pagkatapos mag-boot)
// ------------------------------------------------------------
let started = false;
let warnedNoKey = false;

export function startHr3TrainingSync() {
  if (started) return;
  started = true;

  const run = async () => {
    try {
      if (!process.env.HR3_OUTBOUND_API_KEY) {
        if (!warnedNoKey) {
          warnedNoKey = true;
          console.warn("⚠️ HR3_OUTBOUND_API_KEY is not set. HR3 training sync is disabled.");
        }
        return;
      }
      const from = dayOffset(-JOB_PAST_DAYS);
      const to = dayOffset(JOB_FUTURE_DAYS);
      const result = await pullTrainingSessions(from, to);
      if (result.ok) {
        lastPull.set(`${from}|${to}`, Date.now());
        console.log(`🎓 HR3 trainings synced (${from}..${to}): fetched=${result.fetched} saved=${result.saved} skipped=${result.skipped}`);
        if (result.skipped > 0) console.warn("⚠️ Skipped HR3 training rows:", JSON.stringify(result.errors.slice(0, 5)));
      } else {
        console.warn("⚠️ HR3 training sync failed:", result.error);
      }
    } catch (err) {
      console.warn("⚠️ HR3 training sync error:", err.message);
    }
  };

  const first = setTimeout(run, 20_000);
  const timer = setInterval(run, JOB_INTERVAL_MS);
  first.unref?.();
  timer.unref?.();
}

// ------------------------------------------------------------
// Late waiver: may training ba na sumasakop sa oras ng punch?
// ------------------------------------------------------------
/**
 * True kung may training session ang empleyado sa araw na iyon na nag-ooverlap sa
 * [shiftStart .. punchTime], kaya hindi siya dapat i-mark na "late".
 * Hindi nagta-throw (False kapag may problema, para tuloy pa rin ang punch).
 */
export async function isCoveredByTraining(employeeId, dateStr, shiftStart, punchTime) {
  try {
    if (!employeeId || !dateStr || !shiftStart || !punchTime) return false;
    if (!(await trainingTableReady())) return false;

    const rows = await q(
      `SELECT 1 AS covered
       FROM hr3_training_sessions t
       JOIN employees e ON t.employee_code = UPPER(e.employee_code)
       WHERE e.id = :employee_id
         AND t.date = :date_str
         AND t.start_time <= :punch_time
         AND t.end_time >= :shift_start
       LIMIT 1`,
      {
        employee_id: employeeId,
        date_str: dateStr,
        punch_time: String(punchTime),
        shift_start: String(shiftStart),
      }
    );
    return rows.length > 0;
  } catch (err) {
    console.warn("⚠️ Training coverage check failed:", err.message);
    return false;
  }
}