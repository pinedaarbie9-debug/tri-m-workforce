// backend/src/services/hr1Leave.js
// Pabalik na status update (approved / rejected) papunta sa HR1.
import { q } from "../db.js";

const DEFAULT_WEBHOOK_URL =
  "https://recruitment.mms-tmglt.com/api/v1/webhooks/hr2_leave_status.php";
const TIMEOUT_MS = 6000;
const MAX_ATTEMPTS = 2;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function getHR1WebhookUrl() {
  if (process.env.HR1_LEAVE_WEBHOOK_URL) return process.env.HR1_LEAVE_WEBHOOK_URL;
  // HR1_RECRUITMENT_BASE_URL ay nagtatapos sa /api/v1 (parehong gamit ng hr1Sync.js)
  const base = (process.env.HR1_RECRUITMENT_BASE_URL || "").replace(/\/+$/, "");
  return base ? `${base}/webhooks/hr2_leave_status.php` : DEFAULT_WEBHOOK_URL;
}

/**
 * Ipadala ang approve/reject sa HR1.
 * Hindi ito nagta-throw; laging nagbabalik ng { ok, ... } para hindi masira ang approve flow sa HR2.
 */
export async function notifyHR1LeaveStatus({ reference_id, employee_code, status, approved_by, reason }) {
  const apiKey = process.env.HR1_RECRUITMENT_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "HR1_RECRUITMENT_API_KEY is not configured in .env" };
  }

  const normalized = String(status ?? "").trim().toLowerCase();
  if (!["approved", "rejected"].includes(normalized)) {
    return { ok: false, skipped: true, error: `Status "${status}" is not sent to HR1.` };
  }
  if (!reference_id) {
    return { ok: false, skipped: true, error: "This request has no HR1 reference_id." };
  }

  const url = getHR1WebhookUrl();
  const payload = {
    reference_id: String(reference_id),
    employee_id: employee_code,
    status: normalized,
    approved_by: approved_by || "HR2 Admin",
    reason: reason || null,
  };

  let last = { ok: false, error: "HR1 webhook was not attempted." };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      console.log(`📤 HR1 webhook (attempt ${attempt}) ref=${payload.reference_id} status=${normalized}`);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const text = await response.text();

      if (response.ok) {
        // Minsan 200 pero {"success": false} ang body
        let parsed = null;
        try { parsed = JSON.parse(text); } catch { /* hindi JSON */ }
        if (parsed && (parsed.success === false || parsed.ok === false)) {
          return {
            ok: false,
            http_status: response.status,
            error: `HR1 rejected the update: ${text.slice(0, 300)}`,
          };
        }
        console.log(`✅ HR1 webhook OK: ${response.status}`);
        return { ok: true, http_status: response.status, body: text.slice(0, 500) };
      }

      last = {
        ok: false,
        http_status: response.status,
        error: `HR1 responded ${response.status}: ${text.slice(0, 300)}`,
      };
      if (response.status < 500) break; // 4xx: hindi maaayos ng retry
    } catch (err) {
      last = {
        ok: false,
        error: err.name === "AbortError" ? "HR1 webhook timed out." : `HR1 webhook failed: ${err.message}`,
      };
    } finally {
      clearTimeout(timer);
    }
    if (attempt < MAX_ATTEMPTS) await sleep(700);
  }

  console.error("❌ HR1 webhook failed:", last.error);
  return last;
}

/**
 * I-save sa leave_requests kung nakarating o hindi sa HR1.
 * Hindi ito nagta-throw (kung wala pa ang migration columns, magla-log lang).
 */
export async function recordHR1Result(leaveId, result) {
  try {
    if (result?.ok) {
      await q(
        "UPDATE leave_requests SET hr1_notified_at = NOW(), hr1_notify_error = NULL WHERE id = :id",
        { id: leaveId }
      );
    } else {
      await q("UPDATE leave_requests SET hr1_notify_error = :error WHERE id = :id", {
        error: String(result?.error ?? "Unknown error").slice(0, 500),
        id: leaveId,
      });
    }
  } catch (err) {
    console.warn("⚠️ Could not record HR1 notify result (na-run na ba ang migration?):", err.message);
  }
}