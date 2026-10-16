// backend/src/routes/settings.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { parseSettingValue, getZodError } from "../utils/helpers.js";
import { logAudit } from "../utils/auditlog.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import { ROLE_GROUPS } from "../utils/roles.js";
import { updateSettingsSchema } from "../validators/businessValidator.js";

const router = Router();
router.use(requireAuth);

router.get("/", requireRole(...ROLE_GROUPS.ADMIN_AND_HR), async (req, res) => {
  try {
    const rows = await q(`
      SELECT id, "key", value, category, label, description
      FROM settings
      ORDER BY category, label
    `);
    return res.json(
      rows.map((r) =>
        r.key === "file_export_password_hash" ? { ...r, value: "" } : { ...r, value: parseSettingValue(r.value) }
      )
    );
  } catch (err) {
    return safeError(res, err, "Failed to fetch settings.");
  }
});

router.patch("/", requireRole(...ROLE_GROUPS.ADMIN_ONLY), async (req, res) => {
  try {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { updates } = parsed.data;

    const keys = updates.map((u) => u.key);
    const placeholders = keys.map((_, i) => `:k${i}`).join(",");
    const params = Object.fromEntries(keys.map((k, i) => [`k${i}`, k]));

    const existingRows = await q(`SELECT "key" FROM settings WHERE "key" IN (${placeholders})`, params);
    const existingKeys = new Set(existingRows.map((r) => r.key));

    for (const { key, value } of updates) {
      // 🔒 File export password — i-hash gamit ang bcrypt
      if (key === "file_export_password") {
        const plainPassword = String(value ?? "").trim();
        if (plainPassword.length < 4) {
          return validationError(res, "File export password must be at least 4 characters.");
        }

        const hashed = await bcrypt.hash(plainPassword, 10);
        const existing = await q(`SELECT "key" FROM settings WHERE "key" = 'file_export_password_hash' LIMIT 1`);

        if (existing[0]) {
          await q(
            `UPDATE settings SET value = :value, updated_at = NOW() WHERE "key" = 'file_export_password_hash'`,
            { value: JSON.stringify(hashed) }
          );
        } else {
          await q(
            `INSERT INTO settings ("key", value, category, label, description)
             VALUES ('file_export_password_hash', :value, 'general', 'File Export Password', 'Password required before downloading any exported file')`,
            { value: JSON.stringify(hashed) }
          );
        }
        continue;
      }

      if (!existingKeys.has(key)) return validationError(res, `Invalid setting keys: ${key}`);

      await q(`UPDATE settings SET value = :value, updated_at = NOW() WHERE "key" = :key`, {
        value: JSON.stringify(value),
        key,
      });
    }

    await logAudit({
      userId: req.user.id,
      action: "update",
      module: "settings",
      recordId: null,
      newValues: { keys },
      ip: req.ip,
    });

    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Failed to update settings.");
  }
});

export default router;