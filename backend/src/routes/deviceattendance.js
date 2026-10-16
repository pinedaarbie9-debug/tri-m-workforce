// backend/src/routes/deviceattendance.js
import { Router } from "express";
import express from "express";
import crypto from "node:crypto";
import { q } from "../db.js";
import { getSettings } from "../settings.js";

const router = Router();

// ADMS / iClock PUSH PROTOCOL
router.use(express.text({ type: "*/*", limit: "2mb" }));

const DEVICE_SHARED_SECRET = process.env.DEVICE_SHARED_SECRET || null;

function isAuthorizedDevice(req) {
  if (!DEVICE_SHARED_SECRET) return true; // DEV MODE ONLY
  const provided = req.headers["x-device-key"] || req.query.key;
  return provided === DEVICE_SHARED_SECRET;
}

function timeToMinutes(t) {
  if (!t) return null;
  const parts = String(t).split(":").map(Number);
  return Number(parts[0] || 0) * 60 + Number(parts[1] || 0);
}

function calculateWorkHours(checkIn, checkOut) {
  const inMinutes = timeToMinutes(checkIn);
  const outMinutes = timeToMinutes(checkOut);
  if (inMinutes === null || outMinutes === null) return 0;
  let diff = outMinutes - inMinutes;
  if (diff < 0) diff += 24 * 60; // overnight shift
  return Math.max(0, diff / 60);
}

export async function resolveEmployeeIdFromPin(pin) {
  const trimmedPin = String(pin).trim();
  if (!trimmedPin) return { employee_id: null, method: null };

  // 1. Biometric credential (fingerprint PIN)
  const credRows = await q(
    `SELECT employee_id FROM biometric_credentials
     WHERE device_type = 'fingerprint' AND credential_id = :pin AND is_active = TRUE
     LIMIT 1`,
    { pin: trimmedPin }
  );
  if (credRows[0]) return { employee_id: credRows[0].employee_id, method: "biometric" };

  // 2. Fallback: employee code
  const empRows = await q(
    `SELECT id FROM employees
     WHERE employee_code = :pin AND status = 'active' AND deleted_at IS NULL
     LIMIT 1`,
    { pin: trimmedPin }
  );
  if (empRows[0]) return { employee_id: empRows[0].id, method: "manual" };

  return { employee_id: null, method: null };
}

export async function processPunch(employee_id, dateStr, timeStr, deviceSN, method) {
  const settings = await getSettings(["late_threshold_minutes", "overtime_threshold_hours"]);

  const shiftRows = await q(
    `SELECT s.start_time FROM employee_shifts es
     JOIN shifts s ON s.id = es.shift_id
     WHERE es.employee_id = :employee_id AND es.date = :dateStr
     LIMIT 1`,
    { employee_id, dateStr }
  );
  const shiftStart = shiftRows[0]?.start_time ?? null;

  const existing = await q(
    `SELECT id, check_in, check_out, status FROM attendance
     WHERE employee_id = :employee_id AND date = :dateStr
     LIMIT 1`,
    { employee_id, dateStr }
  );

  const lastLogRows = await q(
    `SELECT type FROM attendance_logs
     WHERE employee_id = :employee_id AND "timestamp"::date = :dateStr::date
     ORDER BY "timestamp" DESC
     LIMIT 1`,
    { employee_id, dateStr }
  );
  const lastType = lastLogRows[0]?.type ?? null;
  const logType = !lastType || lastType === "check_out" ? "check_in" : "check_out";

  if (logType === "check_in") {
    if (!existing[0]) {
      let status = "present";
      if (shiftStart) {
        const lateThreshold = Number(settings.late_threshold_minutes ?? 15);
        const currentMinutes = timeToMinutes(timeStr);
        const shiftMinutes = timeToMinutes(shiftStart);
        if (currentMinutes !== null && shiftMinutes !== null && currentMinutes > shiftMinutes + lateThreshold) {
          status = "late";
        }
      }
      await q(
        `INSERT INTO attendance (id, employee_id, date, check_in, status)
         VALUES (:id, :employee_id, :dateStr, :t, :status)`,
        { id: crypto.randomUUID(), employee_id, dateStr, t: timeStr, status }
      );
    }
  } else if (!existing[0]) {
    // Walang attendance — gumawa ng checkout-only record
    await q(
      `INSERT INTO attendance (id, employee_id, date, check_out, work_hours, overtime_hours, status)
       VALUES (:id, :employee_id, :dateStr, :t, '0.00', '0.00', 'present')`,
      { id: crypto.randomUUID(), employee_id, dateStr, t: timeStr }
    );
  } else {
    const workHours = calculateWorkHours(existing[0].check_in ?? timeStr, timeStr);
    const overtimeHours = Math.max(0, workHours - Number(settings.overtime_threshold_hours ?? 8));
    await q(
      `UPDATE attendance SET check_out = :t, work_hours = :wh, overtime_hours = :oh WHERE id = :id`,
      { t: timeStr, wh: workHours.toFixed(2), oh: overtimeHours.toFixed(2), id: existing[0].id }
    );
  }

  await q(
    `INSERT INTO attendance_logs (id, employee_id, "timestamp", type, method, ip_address)
     VALUES (:id, :employee_id, :timestamp, :logType, :method, :ip_address)`,
    {
      id: crypto.randomUUID(),
      employee_id,
      timestamp: `${dateStr} ${timeStr}`,
      logType,
      method: method === "manual" ? "manual" : "biometric",
      ip_address: deviceSN ?? "unknown",
    }
  );

  return logType;
}

// 1) HANDSHAKE
router.get("/cdata", async (req, res) => {
  if (!isAuthorizedDevice(req)) return res.status(403).type("text/plain").send("FORBIDDEN");

  const { SN, table } = req.query;
  if (table === "ATTLOG" || table === "OPERLOG") return res.type("text/plain").send("OK");

  console.log(`📟 Fingerprint device handshake — SN=${SN}`);
  return res.type("text/plain").send(
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

// 2) ATTENDANCE PUSH
router.post("/cdata", async (req, res) => {
  if (!isAuthorizedDevice(req)) return res.status(403).type("text/plain").send("FORBIDDEN");

  try {
    const { SN, table } = req.query;
    if (table !== "ATTLOG") return res.type("text/plain").send("OK");

    const body = typeof req.body === "string" ? req.body : "";
    const lines = body.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 1000);

    let processed = 0;
    for (const line of lines) {
      const parts = line.split("\t");
      const pin = parts[0];
      const timestamp = parts[1];
      if (!pin || !timestamp) continue;

      const { employee_id, method } = await resolveEmployeeIdFromPin(pin);
      if (!employee_id) {
        console.warn(`⚠️ No employee linked to PIN/Employee Code "${pin}" (SN=${SN}).`);
        continue;
      }

      const [dateStr, timeStr] = timestamp.split(" ");
      if (!dateStr || !timeStr) continue;

      const logType = await processPunch(employee_id, dateStr, timeStr, SN, method);
      console.log(`✅ ${logType.toUpperCase()} logged for employee_id=${employee_id} (PIN/Code "${pin}", method=${method})`);
      processed++;
    }

    return res.type("text/plain").send(`OK: ${processed}`);
  } catch (err) {
    console.error("POST /iclock/cdata (ATTLOG) error:", err);
    return res.type("text/plain").send("OK"); // huwag i-leak ang DB errors sa device
  }
});

// 3) COMMAND POLLING
router.get("/getrequest", (req, res) => res.type("text/plain").send("OK"));

// 4) COMMAND RESULT ACK
router.post("/devicecmd", (req, res) => res.type("text/plain").send("OK"));

export default router;