import { Router } from "express";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET: pwedeng tingnan ng admin at hr_manager (i-adjust kung sino talaga ang dapat)
router.get("/", requireRole("admin", "hr_manager"), async (req, res) => {
  try {
    const rows = await q(`
      SELECT id, \`key\`, value, category, label, description
      FROM settings
      ORDER BY category, label
    `);
    const parsed = rows.map((r) => ({ ...r, value: JSON.parse(r.value) }));
    res.json(parsed);
  } catch (err) {
    console.error("GET /settings error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch settings" });
  }
});

// PATCH: "admin" lang ang pwedeng mag-edit ng system settings
router.patch("/", requireRole("admin"), async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "Kailangan ng updates array." });
    }
    for (const { key, value } of updates) {
      await q(`UPDATE settings SET value = :value WHERE \`key\` = :key`, { value: JSON.stringify(value), key });
    }
    await q("INSERT INTO audit_logs (user_id, action, module, ip_address) VALUES (:uid,'update','settings',:ip)", { uid: req.user.id, ip: req.ip });
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /settings error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to update settings" });
  }
});

export default router;