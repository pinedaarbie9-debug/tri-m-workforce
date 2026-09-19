// backend/src/routes/settings.js
import { Router } from "express";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { safeParseJSON, getZodError } from "../utils/helpers.js";
import { logAudit } from "../utils/auditlog.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import { ROLE_GROUPS } from "../utils/roles.js";
import { updateSettingsSchema } from "../validators/businessValidator.js";

const router = Router();
router.use(requireAuth);

// GET /settings — ADMIN_AND_HR
router.get(
  "/",
  requireRole(...ROLE_GROUPS.ADMIN_AND_HR),
  async (req, res) => {
    try {
      const rows = await q(`
        SELECT id, \`key\`, value, category, label, description
        FROM settings
        ORDER BY category, label
      `);
      const parsed = rows.map((r) => ({ ...r, value: safeParseJSON(r.value) }));
      return res.json(parsed);
    } catch (err) {
      return safeError(res, err, "Failed to fetch settings.");
    }
  }
);

// PATCH /settings — ADMIN_ONLY
router.patch(
  "/",
  requireRole(...ROLE_GROUPS.ADMIN_ONLY),
  async (req, res) => {
    try {
      const parsed = updateSettingsSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, getZodError(parsed));
      const { updates } = parsed.data;

      const keys = updates.map((u) => u.key);
      const placeholders = keys.map((_, i) => `:k${i}`).join(",");
      const params = Object.fromEntries(keys.map((k, i) => [`k${i}`, k]));

      const existingRows = await q(
        `SELECT \`key\` FROM settings WHERE \`key\` IN (${placeholders})`,
        params
      );
      const existingKeys = new Set(existingRows.map((r) => r.key));
      const invalidKeys = keys.filter((k) => !existingKeys.has(k));

      if (invalidKeys.length > 0) {
        return validationError(
          res,
          `Invalid setting keys: ${invalidKeys.join(", ")}`
        );
      }

      for (const { key, value } of updates) {
        await q(`UPDATE settings SET value = :value WHERE \`key\` = :key`, {
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
  }
);

export default router;