import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /audit-logs
router.get("/", async (req, res) => {
  const rows = await q(`
    SELECT
      a.*,
      JSON_OBJECT('id', u.id, 'full_name', u.full_name, 'email', u.email) AS user
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at DESC
    LIMIT 500
  `);
  res.json(rows.map((r) => ({ ...r, user: r.user ? JSON.parse(r.user) : null })));
});

export default router;
