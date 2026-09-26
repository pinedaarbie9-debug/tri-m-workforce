import { Router } from "express";
import { q } from "../db.js";
import { resolveEmployeeIdFromPin, processPunch } from "./deviceattendance.js";

const router = Router();

// -----------------------------------------------------------------------
// Simpleng shared-secret na proteksyon (parehong pattern ng deviceattendance.js)
// Ilagay ang FINGERPRINT_BRIDGE_KEY sa .env file mo, tapos ilagay din ito
// bilang "x-bridge-key" header sa C# app pagtawag nito sa mga endpoint na ito.
// -----------------------------------------------------------------------
const BRIDGE_KEY = process.env.FINGERPRINT_BRIDGE_KEY || null;

function isAuthorizedBridge(req) {
  if (!BRIDGE_KEY) return true; // walang secret naka-set = walang check (OK lang sa local dev)
  return req.headers["x-bridge-key"] === BRIDGE_KEY;
}

// -----------------------------------------------------------------------
// GET /fingerprint-bridge/templates
// -----------------------------------------------------------------------
// Tinatawag ito ng C# app tuwing bubukas (o pana-panahon) para i-download
// ang LAHAT ng aktibong fingerprint templates papunta sa local in-memory DB
// (zkfp2.DBAdd loop). Kailangan ito para malaman ng C# app kung "sino"
// ang tumutugma sa isang bagong scan.
// -----------------------------------------------------------------------
router.get("/templates", async (req, res) => {
  if (!isAuthorizedBridge(req)) return res.status(403).json({ error: "FORBIDDEN" });
  try {
    const rows = await q(`
      SELECT credential_id, fingerprint_template
      FROM biometric_credentials
      WHERE device_type = 'fingerprint' AND is_active = TRUE AND fingerprint_template IS NOT NULL
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /fingerprint-bridge/templates error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch templates" });
  }
});

// -----------------------------------------------------------------------
// POST /fingerprint-bridge/save-template
// -----------------------------------------------------------------------
// Tinatawag ito ng C# app PAGKATAPOS ng successful na 3x enroll sa ZK9500.
// Hinahanap nito ang biometric_credentials row na TUMUTUGMA sa credential_id
// (PIN) na inilagay sa web app's Enroll modal, tapos ise-save ang aktwal
// na fingerprint template doon.
//
// Kaya ang TAMANG PAGKAKASUNOD-SUNOD:
//   1. I-scan muna sa C# app -> makakakuha ng bagong PIN (o ikaw mismo
//      ang pumili ng PIN sa C# app)
//   2. Sa web app, i-enroll ang empleyado gamit ang PIN na iyon
//   3. SAKA lang tatawagin ng C# app ang endpoint na ito para i-attach
//      ang template sa row na kagagawa lang sa web
// -----------------------------------------------------------------------
router.post("/save-template", async (req, res) => {
  if (!isAuthorizedBridge(req)) return res.status(403).json({ error: "FORBIDDEN" });
  try {
    const { credential_id, fingerprint_template } = req.body;
    if (!credential_id || !fingerprint_template) {
      return res.status(400).json({ error: "Kailangan ng credential_id at fingerprint_template." });
    }

    const rows = await q(
      `SELECT id FROM biometric_credentials
       WHERE device_type = 'fingerprint' AND credential_id = :credential_id AND is_active = TRUE
       LIMIT 1`,
      { credential_id: String(credential_id).trim() }
    );
    if (!rows[0]) {
      return res.status(404).json({
        error: `Walang aktibong fingerprint credential na may PIN "${credential_id}". I-enroll muna ito sa web app gamit ang PIN na ito.`,
      });
    }

    await q(`UPDATE biometric_credentials SET fingerprint_template = :tpl WHERE id = :id`, {
      tpl: fingerprint_template,
      id: rows[0].id,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("POST /fingerprint-bridge/save-template error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to save template" });
  }
});

// -----------------------------------------------------------------------
// POST /fingerprint-bridge/punch
// -----------------------------------------------------------------------
// Tinatawag ito ng C# app kapag may na-IDENTIFY na fingerprint match
// (araw-araw na time-in/time-out). Ginagamit nito ang parehong
// resolveEmployeeIdFromPin + processPunch logic mula sa deviceattendance.js
// para consistent ang resulta sa iClock-based devices.
// -----------------------------------------------------------------------
router.post("/punch", async (req, res) => {
  if (!isAuthorizedBridge(req)) return res.status(403).json({ error: "FORBIDDEN" });
  try {
    const { credential_id } = req.body;
    if (!credential_id) {
      return res.status(400).json({ error: "Kailangan ng credential_id." });
    }

    const { employee_id, method } = await resolveEmployeeIdFromPin(credential_id);
    if (!employee_id) {
      return res.status(404).json({ error: `Walang empleyadong naka-link sa PIN "${credential_id}".` });
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);

    const logType = await processPunch(employee_id, dateStr, timeStr, "ZK9500-USB", method);

    res.json({ success: true, employee_id, logType });
  } catch (err) {
    console.error("POST /fingerprint-bridge/punch error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to process punch" });
  }
});

export default router;