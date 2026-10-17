import { Router } from "express";
import { q } from "../db.js";
import { resolveEmployeeIdFromPin, processPunch } from "./deviceattendance.js";
import { nowManila } from "../utils/helpers.js";
import {
  touchBridge,
  claimNextWaiting,
  updateProgress,
  completeSession,
  failSession,
} from "../utils/enrollSessions.js";
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

    const { dateStr, timeStr } = nowManila();

    const logType = await processPunch(employee_id, dateStr, timeStr, "ZK9500-USB", method);

    res.json({ success: true, employee_id, logType });
  } catch (err) {
    console.error("POST /fingerprint-bridge/punch error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to process punch" });
  }
});

// =======================================================================
// LIVE ENROLLMENT (bagong flow — hindi na kailangan ng manual PIN / save-template)
// =======================================================================

// GET /fingerprint-bridge/enroll/pending
// Pina-poll ito ng C# app (~1x kada segundo). Ang pag-poll mismo ang
// nagsasabi sa web na "online" ang scanner app.
router.get("/enroll/pending", (req, res) => {
  if (!isAuthorizedBridge(req)) return res.status(403).json({ error: "FORBIDDEN" });
  touchBridge();
  const s = claimNextWaiting();
  if (!s) return res.json({ pending: false });
  res.json({
    pending: true,
    session_id: s.id,
    credential_id: s.credential_id,
    employee_name: s.employee_name,
  });
});

// POST /fingerprint-bridge/enroll/:id/progress   body: { step: 0..3, message }
// 409 + { stop: true } = ihinto na ng C# app ang capture (na-cancel/na-expire).
router.post("/enroll/:id/progress", (req, res) => {
  if (!isAuthorizedBridge(req)) return res.status(403).json({ error: "FORBIDDEN" });
  touchBridge();
  const r = updateProgress(req.params.id, req.body?.step, req.body?.message);
  if (!r.ok) return res.status(409).json({ error: r.reason, stop: true });
  res.json({ success: true });
});

// POST /fingerprint-bridge/enroll/:id/complete   body: { fingerprint_template }
router.post("/enroll/:id/complete", async (req, res) => {
  if (!isAuthorizedBridge(req)) return res.status(403).json({ error: "FORBIDDEN" });
  touchBridge();
  try {
    const { fingerprint_template } = req.body ?? {};
    if (!fingerprint_template) {
      return res.status(400).json({ error: "Kailangan ng fingerprint_template." });
    }
    const r = await completeSession(req.params.id, String(fingerprint_template));
    if (!r.ok) return res.status(409).json({ error: r.error ?? r.reason, stop: true });
    res.json({ success: true, credential_id: r.credential_id });
  } catch (err) {
    console.error("POST /fingerprint-bridge/enroll/:id/complete error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to complete enrollment" });
  }
});

// POST /fingerprint-bridge/enroll/:id/fail   body: { message }
router.post("/enroll/:id/fail", (req, res) => {
  if (!isAuthorizedBridge(req)) return res.status(403).json({ error: "FORBIDDEN" });
  touchBridge();
  failSession(req.params.id, req.body?.message);
  res.json({ success: true });
});

export default router;