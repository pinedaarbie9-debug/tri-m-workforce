import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

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
      user: r.user ? JSON.parse(r.user) : null,
      old_values: r.old_values ? JSON.parse(r.old_values) : null,
      new_values: r.new_values ? JSON.parse(r.new_values) : null,
    }));

    res.json(parsed);
  } catch (err) {
    console.error("GET /audit-logs error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch audit logs" });
  }
});

export default router;