// backend/src/utils/auditLog.js
import { q } from "../db.js";

/**
 * I-log ang isang action sa audit_logs, kasama ang snapshot ng pangalan
 * ng affected record (old_values/new_values), para makita agad sa
 * Audit Logs page kung SINO/ANO talaga ang na-delete/na-update.
 */
export async function logAudit({ userId, action, module, recordId, oldValues, newValues, ip }) {
  await q(
    `INSERT INTO audit_logs (user_id, action, module, record_id, old_values, new_values, ip_address)
     VALUES (:userId, :action, :module, :recordId, :oldValues, :newValues, :ip)`,
    {
      userId: userId ?? null,
      action,
      module,
      recordId: recordId ?? null,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      ip: ip ?? null,
    }
  );
}