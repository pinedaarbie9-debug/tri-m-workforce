import { Router } from "express";
import express from "express";
import crypto from "node:crypto";
import { q } from "../db.js";
import { getSettings } from "../settings.js";

const router = Router();

// =============================================================================
// ADMS / iClock PUSH PROTOCOL
// (parehong paliwanag gaya ng dati)
// =============================================================================
router.use(express.text({ type: "*/*", limit: "2mb" }));

const DEVICE_SHARED_SECRET = process.env.DEVICE_SHARED_SECRET || null;

function isAuthorizedDevice(req) {
  if (!DEVICE_SHARED_SECRET) return true;
  const provided = req.headers["x-device-key"] || req.query.key;
  return provided === DEVICE_SHARED_SECRET;
}

function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

async function resolveEmployeeIdFromPin(pin) {
  const trimmedPin = String(pin).trim();

  const credRows = await q(
    `SELECT employee_id FROM biometric_credentials
     WHERE device_type = 'fingerprint' AND credential_id = :pin AND is_active = TRUE
     LIMIT 1`,
    { pin: trimmedPin }
  );
  if (credRows[0]) {
    return { employee_id: credRows[0].employee_id, method: "biometric" };
  }

  const empRows = await q(
    `SELECT id FROM employees WHERE employee_code = :pin AND status = 'active' LIMIT 1`,
    { pin: trimmedPin }
  );
  if (empRows[0]) {
    return { employee_id: empRows[0].id, method: "manual" };
  }

  return { employee_id: null, method: null };
}

async function processPunch(employee_id, dateStr, timeStr, deviceSN, method) {
  const settings = await getSettings(["late_threshold_minutes", "overtime_threshold_hours"]);

  const shiftRows = await q(
    `SELECT s.start_time FROM employee_shifts es JOIN shifts s ON s.id = es.shift_id
     WHERE es.employee_id = :employee_id AND es.date = :dateStr LIMIT 1`,
    { employee_id, dateStr }
  );
  const shiftStart = shiftRows[0]?.start_time ?? null;

  const existing = await q(
    "SELECT id, check_in, check_out FROM attendance WHERE employee_id = :employee_id AND date = :dateStr",
    { employee_id, dateStr }
  );

  // FIX: kunin ang PINAKAHULING log ng araw na ito para malaman kung ano ang
  // dapat na SUSUNOD na uri ng punch — hindi lang base sa check_in/check_out
  // columns (na isang beses lang nagagamit kada araw sa summary row), kundi
  // sa aktwal na huling naitalang log sa attendance_logs. Dati, pagkatapos
  // malagyan ng parehong check_in AT check_out ang araw, anumang susunod na
  // punch ay laging babagsak sa "else" branch at magla-log lang ng
  // "check_in" nang paulit-ulit nang walang totoong pag-toggle — ito yung
  // dahilan kung bakit "Checked In" nang "Checked In" nang paulit-ulit.
  const lastLogRows = await q(
    `SELECT type FROM attendance_logs
     WHERE employee_id = :employee_id AND DATE(timestamp) = :dateStr
     ORDER BY timestamp DESC LIMIT 1`,
    { employee_id, dateStr }
  );
  const lastType = lastLogRows[0]?.type ?? null;

  // Wastong pag-toggle: kung wala pang log ngayong araw O "check_out" ang
  // huling log, ang susunod ay "check_in". Kung "check_in" ang huling log,
  // ang susunod ay "check_out". Ganito, gaano man karaming beses mag-punch
  // sa isang araw (hal. paglabas/pagbalik sa break), tama pa rin ang pag-alternate.
  const logType = !lastType || lastType === "check_out" ? "check_in" : "check_out";

  if (logType === "check_in") {
    if (!existing[0]) {
      // Unang check-in ng araw — gumawa ng bagong attendance summary row.
      let status = "present";
      if (shiftStart) {
        const lateThreshold = settings.late_threshold_minutes ?? 15;
        if (timeToMinutes(timeStr) > timeToMinutes(shiftStart) + lateThreshold) status = "late";
      }
      await q(
        `INSERT INTO attendance (id, employee_id, date, check_in, status) VALUES (:id, :employee_id, :dateStr, :t, :status)`,
        { id: crypto.randomUUID(), employee_id, dateStr, t: timeStr, status }
      );
    }
    // FIX: kung may existing row na (ibig sabihin bumalik lang siya mula sa
    // isang naunang check-out ngayong araw din — hal. galing sa break),
    // hindi na natin babaguhin ang orihinal na "check_in" ng araw. Nananatili
    // itong "unang pagpasok", habang ang bagong log lang ang magmamarka na
    // bumalik siya. Kung gusto mo talagang i-extend/i-reset ang check_out
    // tuwing bumabalik siya, sabihin mo lang para maidagdag natin.
  } else {
    // check_out — i-update ang buod ng araw at i-recompute ang work hours
    // base sa orihinal na check_in (o sa oras mismo ng punch na ito kung
    // sa kahit anong dahilan ay walang existing row pa).
    const referenceCheckIn = existing[0]?.check_in ?? timeStr;
    const inMinutes = timeToMinutes(referenceCheckIn);
    const outMinutes = timeToMinutes(timeStr);
    const workHours = Math.max(0, (outMinutes - inMinutes) / 60);
    const overtimeThreshold = settings.overtime_threshold_hours ?? 8;
    const overtimeHours = Math.max(0, workHours - overtimeThreshold);

    if (existing[0]) {
      await q(
        "UPDATE attendance SET check_out = :t, work_hours = :wh, overtime_hours = :oh WHERE id = :id",
        { t: timeStr, wh: workHours.toFixed(2), oh: overtimeHours.toFixed(2), id: existing[0].id }
      );
    } else {
      // Malabong mangyari (check-out bago pa man magkaroon ng check-in row),
      // pero sakaling mangyari, gumawa pa rin tayo ng row para hindi mawala
      // ang datos.
      await q(
        `INSERT INTO attendance (id, employee_id, date, check_out, work_hours, overtime_hours, status)
         VALUES (:id, :employee_id, :dateStr, :t, :wh, :oh, 'present')`,
        {
          id: crypto.randomUUID(),
          employee_id,
          dateStr,
          t: timeStr,
          wh: workHours.toFixed(2),
          oh: overtimeHours.toFixed(2),
        }
      );
    }
  }

  await q(
    `INSERT INTO attendance_logs (id, employee_id, timestamp, type, method, device_id)
     VALUES (:id, :employee_id, :timestamp, :logType, :method, :device_id)`,
    {
      id: crypto.randomUUID(),
      employee_id,
      timestamp: `${dateStr} ${timeStr}`,
      logType,
      method: method === "manual" ? "manual" : "biometric",
      device_id: deviceSN ?? "unknown",
    }
  );

  return logType;
}

// -----------------------------------------------------------------------
// 1) HANDSHAKE
// -----------------------------------------------------------------------
router.get("/cdata", async (req, res) => {
  if (!isAuthorizedDevice(req)) {
    return res.status(403).type("text/plain").send("FORBIDDEN");
  }

  const { SN, table } = req.query;

  if (table === "ATTLOG" || table === "OPERLOG") {
    return res.type("text/plain").send("OK");
  }

  console.log(`📟 Fingerprint device handshake — SN=${SN}`);
  res.type("text/plain").send(
    [
      `GET OPTION FROM: ${SN}`,
      "Stamp=9999",
      "OpStamp=9999",
      "ErrorDelay=30",
      "Delay=30",
      "TransFlag=TransData AttLog",
      "TimeZone=8",
      "Realtime=1",
      "Encrypt=0",
    ].join("\n")
  );
});

// -----------------------------------------------------------------------
// 2) ATTENDANCE PUSH
// -----------------------------------------------------------------------
router.post("/cdata", async (req, res) => {
  if (!isAuthorizedDevice(req)) {
    return res.status(403).type("text/plain").send("FORBIDDEN");
  }

  try {
    const { SN, table } = req.query;
    if (table !== "ATTLOG") {
      return res.type("text/plain").send("OK");
    }

    const body = typeof req.body === "string" ? req.body : "";
    const lines = body
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 1000); // safety cap laban sa napakalaking push

    let processed = 0;
    for (const line of lines) {
      const parts = line.split("\t");
      const pin = parts[0];
      const timestamp = parts[1];
      if (!pin || !timestamp) continue;

      const { employee_id, method } = await resolveEmployeeIdFromPin(pin);
      if (!employee_id) {
        console.warn(`⚠️  Walang empleyadong naka-link sa PIN/Employee Code "${pin}" (SN=${SN}). I-check ang Biometric Auth enrollment o Employee Code.`);
        continue;
      }

      const [dateStr, timeStr] = timestamp.split(" ");
      const logType = await processPunch(employee_id, dateStr, timeStr, SN, method);
      console.log(`✅ ${logType.toUpperCase()} na-log para sa employee_id=${employee_id} (PIN/Code "${pin}", method=${method})`);
      processed++;
    }

    res.type("text/plain").send(`OK: ${processed}`);
  } catch (err) {
    console.error("POST /iclock/cdata (ATTLOG) error:", err);
    res.type("text/plain").send("OK");
  }
});

// -----------------------------------------------------------------------
// 3) COMMAND POLLING
// -----------------------------------------------------------------------
router.get("/getrequest", (req, res) => {
  res.type("text/plain").send("OK");
});

// -----------------------------------------------------------------------
// 4) COMMAND RESULT ACKNOWLEDGEMENT
// -----------------------------------------------------------------------
router.post("/devicecmd", (req, res) => {
  res.type("text/plain").send("OK");
});

export default router;