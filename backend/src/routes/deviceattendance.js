import { Router } from "express";
import express from "express";
import { q } from "../db.js";
import { getSettings } from "../settings.js";

const router = Router();

// =============================================================================
// ADMS / iClock PUSH PROTOCOL — ito ang standard na protocol na ginagamit ng
// ZKTeco, eSSL, Anviz, at karamihan ng budget fingerprint time-attendance
// devices para mag-push ng attendance data papunta sa isang server.
//
// MAHALAGA: HINDI natin dinadagdag ang requireAuth (JWT) dito dahil ang
// fingerprint device mismo ang tumatawag sa mga endpoint na ito — hindi ito
// isang naka-login na user sa browser. Sa isang tunay na SME deployment,
// ang security dito ay dapat nasa NETWORK LEVEL (hal. ang kiosk device ay
// nasa parehong LAN/VLAN lang ng server, o naka-firewall papasok mula labas).
//
// Kailangan din ng "raw text" body parser dito (hindi JSON) dahil ganito
// talaga nagpapadala ng attendance logs ang mga device na ito — bilang
// plain text na naka-tab-separate. Naka-scope lang ito sa router na ito,
// hindi apektado ang ibang parte ng app na gumagamit pa rin ng express.json().
// =============================================================================
router.use(express.text({ type: "*/*", limit: "2mb" }));

function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Hinahanap kung sinong empleyado ang may-ari ng "PIN" na naka-enroll sa
// fingerprint device. Ang PIN na ito ay nakatago sa `credential_id` column
// ng biometric_credentials (na-set ng admin noong nag-enroll ng fingerprint
// credential sa Biometric Auth page).
async function resolveEmployeeIdFromPin(pin) {
  const rows = await q(
    `SELECT employee_id FROM biometric_credentials
     WHERE device_type = 'fingerprint' AND credential_id = :pin AND is_active = TRUE
     LIMIT 1`,
    { pin: String(pin) }
  );
  return rows[0]?.employee_id ?? null;
}

// Parehong logic ng check-in/check-out sa attendance.js, pero ito ang bersyon
// na tinatawag mula sa fingerprint device push (walang req.user dahil walang
// naka-login na session dito — device lang ang nag-i-identify ng empleyado).
async function processPunch(employee_id, dateStr, timeStr, deviceSN) {
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

  let logType;

  if (!existing[0] || !existing[0].check_in) {
    // Walang check-in pa ngayong araw -> ito ang check-in.
    let status = "present";
    if (shiftStart) {
      const lateThreshold = settings.late_threshold_minutes ?? 15;
      if (timeToMinutes(timeStr) > timeToMinutes(shiftStart) + lateThreshold) status = "late";
    }
    if (existing[0]) {
      await q("UPDATE attendance SET check_in = :t, status = :status WHERE id = :id", {
        t: timeStr,
        status,
        id: existing[0].id,
      });
    } else {
      await q(
        `INSERT INTO attendance (id, employee_id, date, check_in, status) VALUES (:id, :employee_id, :dateStr, :t, :status)`,
        { id: crypto.randomUUID(), employee_id, dateStr, t: timeStr, status }
      );
    }
    logType = "check_in";
  } else if (!existing[0].check_out) {
    // May check-in na, wala pang check-out -> ito ang check-out.
    const inMinutes = timeToMinutes(existing[0].check_in);
    const outMinutes = timeToMinutes(timeStr);
    const workHours = Math.max(0, (outMinutes - inMinutes) / 60);
    const overtimeThreshold = settings.overtime_threshold_hours ?? 8;
    const overtimeHours = Math.max(0, workHours - overtimeThreshold);
    await q(
      "UPDATE attendance SET check_out = :t, work_hours = :wh, overtime_hours = :oh WHERE id = :id",
      { t: timeStr, wh: workHours.toFixed(2), oh: overtimeHours.toFixed(2), id: existing[0].id }
    );
    logType = "check_out";
  } else {
    // Kumpleto na ang check_in/check_out ngayong araw. Extra scan na lang ito
    // (hal. bumalik pumasok pagkatapos mag-out). Huwag nang galawin ang
    // attendance record, pero i-lo-log pa rin natin bilang audit trail.
    logType = "check_in";
  }

  await q(
    `INSERT INTO attendance_logs (id, employee_id, timestamp, type, method, device_id)
     VALUES (:id, :employee_id, :timestamp, :logType, 'biometric', :device_id)`,
    {
      id: crypto.randomUUID(),
      employee_id,
      timestamp: `${dateStr} ${timeStr}`,
      logType,
      device_id: deviceSN ?? "unknown",
    }
  );

  return logType;
}

// -----------------------------------------------------------------------
// 1) HANDSHAKE
// -----------------------------------------------------------------------
router.get("/cdata", async (req, res) => {
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
  try {
    const { SN, table } = req.query;
    if (table !== "ATTLOG") {
      return res.type("text/plain").send("OK");
    }

    const body = typeof req.body === "string" ? req.body : "";
    const lines = body
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    let processed = 0;
    for (const line of lines) {
      const parts = line.split("\t");
      const pin = parts[0];
      const timestamp = parts[1];
      if (!pin || !timestamp) continue;

      const employee_id = await resolveEmployeeIdFromPin(pin);
      if (!employee_id) {
        console.warn(`⚠️  Walang empleyadong naka-link sa fingerprint PIN "${pin}" (SN=${SN}). I-check ang Biometric Auth enrollment.`);
        continue;
      }

      const [dateStr, timeStr] = timestamp.split(" ");
      const logType = await processPunch(employee_id, dateStr, timeStr, SN);
      console.log(`✅ ${logType.toUpperCase()} na-log para sa employee_id=${employee_id} (PIN ${pin})`);
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