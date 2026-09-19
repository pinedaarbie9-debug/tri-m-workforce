// backend/src/routes/auditLogs.js
import { Router } from "express";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { safeParseJSON } from "../utils/helpers.js";
import { safeError } from "../utils/errorResponse.js";
import { ROLE_GROUPS } from "../utils/roles.js";

const router = Router();
router.use(requireAuth);

// 🔒 Admin only
router.use(requireRole(...ROLE_GROUPS.ADMIN_ONLY));

router.get("/", async (req, res) => {
  try {
    const rows = await q(`
      SELECT
        a.*,
        JSON_OBJECT('id', u.id, 'full_name', u.full_name, 'email', u.email, 'role', u.role) AS user
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 500
    `);

    const parsed = rows.map((r) => ({
      ...r,
      user: safeParseJSON(r.user),
      old_values: safeParseJSON(r.old_values),
      new_values: safeParseJSON(r.new_values),
    }));

    return res.json(parsed);
  } catch (err) {
    return safeError(res, err, "Failed to fetch audit logs.");
  }
});

export default router;