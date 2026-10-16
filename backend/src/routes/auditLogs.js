import { Router } from "express";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { safeParseJSON } from "../utils/helpers.js";
import { safeError } from "../utils/errorResponse.js";
import { ROLE_GROUPS } from "../utils/roles.js";

const router = Router();
router.use(requireAuth);
router.use(requireRole(...ROLE_GROUPS.ADMIN_ONLY));

router.get("/", async (req, res) => {
  try {
    const rows = await q(`
      SELECT
        a.*,
        json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'role', u.role) AS "user"
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 500
    `);
    return res.json(
      rows.map((r) => ({
        ...r,
        user: r.user?.id ? safeParseJSON(r.user) : null,
        old_values: safeParseJSON(r.old_values),
        new_values: safeParseJSON(r.new_values),
      }))
    );
  } catch (err) {
    return safeError(res, err, "Failed to fetch audit logs.");
  }
});

export default router;