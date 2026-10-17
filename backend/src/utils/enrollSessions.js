// backend/src/utils/enrollSessions.js
// -----------------------------------------------------------------------
// In-memory store para sa LIVE fingerprint enrollment sessions.
//
// Daloy:
//   Web modal  --POST /biometric/enroll-session-->  gumagawa ng session (waiting)
//   C# bridge  --GET  /fingerprint-bridge/enroll/pending--> kinukuha ang session (capturing)
//   C# bridge  --POST /fingerprint-bridge/enroll/:id/progress--> step 1..3
//   C# bridge  --POST /fingerprint-bridge/enroll/:id/complete--> template -> DB row (success)
//   Web modal  --GET  /biometric/enroll-session/:id (poll)--> live na status
//
// Note: in-memory ito, kaya OK para sa isang backend instance. Kapag
// nag-restart ang server, mawawala ang mga aktibong session (3-5 min lang
// naman ang buhay nila). Kung mag-scale ka sa maraming instance, ilipat sa DB.
// -----------------------------------------------------------------------
import crypto from "node:crypto";
import { q } from "../db.js";
import { logAudit } from "./auditlog.js";

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minuto para tapusin ang 3 scans
const KEEP_FINISHED_MS = 10 * 60 * 1000; // itago muna ang tapos na session bago burahin
const BRIDGE_ONLINE_MS = 10 * 1000; // "online" ang C# app kung nag-poll sa huling 10s
const TOTAL_STEPS = 3;
const TERMINAL = new Set(["success", "failed", "cancelled", "expired"]);

const sessions = new Map();
let lastBridgeSeen = 0;

export function touchBridge() {
  lastBridgeSeen = Date.now();
}

export function isBridgeOnline() {
  return Date.now() - lastBridgeSeen < BRIDGE_ONLINE_MS;
}

function finish(s, status, message) {
  s.status = status;
  s.message = message;
  s.updated_at = Date.now();
}

function sweep() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (!TERMINAL.has(s.status) && now > s.expires_at) {
      finish(s, "expired", "Na-timeout ang enrollment. Subukan ulit.");
    }
    if (TERMINAL.has(s.status) && now - s.updated_at > KEEP_FINISHED_MS) {
      sessions.delete(id);
    }
  }
}

export function publicSession(s) {
  return {
    id: s.id,
    status: s.status, // waiting | capturing | success | failed | cancelled | expired
    step: s.step,
    total_steps: TOTAL_STEPS,
    message: s.message,
    credential_id: s.credential_id,
    employee_id: s.employee_id,
    employee_name: s.employee_name,
    credential_row_id: s.credential_row_id ?? null,
    bridge_online: isBridgeOnline(),
  };
}

export function createSession({ employee_id, employee_name, credential_id, device_name, created_by, ip }) {
  sweep();
  const now = Date.now();
  const s = {
    id: crypto.randomUUID(),
    employee_id,
    employee_name: employee_name ?? null,
    credential_id,
    device_name: device_name || null,
    created_by,
    ip: ip ?? null,
    status: "waiting",
    step: 0,
    message: "Naghihintay sa scanner app...",
    created_at: now,
    updated_at: now,
    expires_at: now + SESSION_TTL_MS,
  };
  sessions.set(s.id, s);
  return s;
}

export function getSession(id) {
  sweep();
  return sessions.get(id) ?? null;
}

export function getActiveSession() {
  sweep();
  for (const s of sessions.values()) {
    if (!TERMINAL.has(s.status)) return s;
  }
  return null;
}

export function cancelSession(id, message = "Na-cancel ang enrollment.") {
  const s = sessions.get(id);
  if (!s || TERMINAL.has(s.status)) return false;
  finish(s, "cancelled", message);
  return true;
}

// Kinukuha ng C# bridge ang pinakamatandang "waiting" session at nagiging "capturing".
export function claimNextWaiting() {
  sweep();
  let oldest = null;
  for (const s of sessions.values()) {
    if (s.status === "waiting" && (!oldest || s.created_at < oldest.created_at)) oldest = s;
  }
  if (!oldest) return null;
  oldest.status = "capturing";
  oldest.step = 0;
  oldest.message = "Ilagay ang daliri sa scanner (1/3)";
  oldest.updated_at = Date.now();
  return oldest;
}

// Ibinabalik ang { ok:false, reason } kapag dapat nang tumigil ang C# app
// (na-cancel ng admin, na-expire, atbp.)
export function updateProgress(id, step, message) {
  sweep();
  const s = sessions.get(id);
  if (!s) return { ok: false, reason: "not_found" };
  if (s.status !== "capturing") return { ok: false, reason: s.status };
  s.step = Math.max(0, Math.min(TOTAL_STEPS, Number(step) || 0));
  if (message) s.message = String(message).slice(0, 200);
  s.updated_at = Date.now();
  return { ok: true };
}

export function failSession(id, message) {
  const s = sessions.get(id);
  if (!s || TERMINAL.has(s.status)) return false;
  finish(s, "failed", String(message || "Nabigo ang enrollment.").slice(0, 200));
  return true;
}

async function finalizeEnrollment(s, template) {
  const sameEmployee = await q(
    `SELECT id FROM biometric_credentials
     WHERE employee_id = :employee_id AND device_type = 'fingerprint' AND is_active = TRUE`,
    { employee_id: s.employee_id }
  );
  if (sameEmployee.length) throw new Error("ALREADY_ENROLLED");

  const pinTaken = await q(
    `SELECT id FROM biometric_credentials
     WHERE device_type = 'fingerprint' AND credential_id = :credential_id AND is_active = TRUE`,
    { credential_id: s.credential_id }
  );
  if (pinTaken.length) throw new Error("PIN_TAKEN");

  const id = crypto.randomUUID();
  await q(
    `INSERT INTO biometric_credentials
       (id, employee_id, device_type, device_name, credential_id, fingerprint_template, is_active)
     VALUES (:id, :employee_id, 'fingerprint', :device_name, :credential_id, :tpl, TRUE)`,
    {
      id,
      employee_id: s.employee_id,
      device_name: s.device_name,
      credential_id: s.credential_id,
      tpl: template,
    }
  );

  await logAudit({
    userId: s.created_by,
    action: "create",
    module: "biometric_credentials",
    recordId: id,
    newValues: {
      full_name: s.employee_name,
      device_type: "fingerprint",
      credential_id: s.credential_id,
      enrolled_via: "live_scanner",
    },
    ip: s.ip,
  });

  return id;
}

// Tinatawag kapag natapos na ng C# app ang 3 scans at may merged template na.
export async function completeSession(id, template) {
  sweep();
  const s = sessions.get(id);
  if (!s) return { ok: false, reason: "not_found" };
  if (s.status !== "capturing") return { ok: false, reason: s.status };

  try {
    s.credential_row_id = await finalizeEnrollment(s, template);
    s.step = TOTAL_STEPS;
    finish(s, "success", "Matagumpay na na-enroll ang fingerprint!");
    return { ok: true, credential_id: s.credential_id };
  } catch (err) {
    const msg =
      err.message === "ALREADY_ENROLLED"
        ? "May active fingerprint na ang empleyadong ito."
        : err.message === "PIN_TAKEN"
          ? "Nagamit na ang PIN. Subukan ulit."
          : "Hindi na-save ang fingerprint. Subukan ulit.";
    console.error("completeSession error:", err);
    finish(s, "failed", msg);
    return { ok: false, reason: "failed", error: msg };
  }
}