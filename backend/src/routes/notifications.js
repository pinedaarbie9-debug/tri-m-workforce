import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /notifications — sariling notifications ng kahit sinong naka-login (admin man o employee)
router.get("/", async (req, res) => {
  try {
    const rows = await q(
      "SELECT * FROM notifications WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 100",
      { user_id: req.user.id }
    );
    res.json(rows.map((r) => ({ ...r, is_read: !!r.is_read })));
  } catch (err) {
    console.error("GET /notifications error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch notifications" });
  }
});

// GET /notifications/unread-count — bilang ng unread notifications ng naka-login
// IMPORTANT: dapat ITO ay nasa ITAAS ng "/:id/read" kung meron mang generic "/:id" route,
// para hindi mag-match ang "unread-count" bilang isang :id param. Sa ngayon walang
// conflicting "/:id" (GET) route dito kaya safe ang pagkakalagay.
router.get("/unread-count", async (req, res) => {
  try {
    const rows = await q(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = :user_id AND is_read = 0",
      { user_id: req.user.id }
    );
    res.json({ count: rows[0]?.count ?? 0 });
  } catch (err) {
    console.error("GET /notifications/unread-count error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch unread count" });
  }
});

// GET /notifications/me — alias, ginagamit ng Employee Portal
router.get("/me", async (req, res) => {
  try {
    const rows = await q(
      "SELECT * FROM notifications WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 100",
      { user_id: req.user.id }
    );
    res.json(rows.map((r) => ({ ...r, is_read: !!r.is_read })));
  } catch (err) {
    console.error("GET /notifications/me error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch notifications" });
  }
});

// PATCH /notifications/read-all — markahan lahat bilang nabasa
// IMPORTANT: dapat ITO ay nasa ITAAS ng "/:id/read", kung hindi, tatakbo muna ang
// "/:id/read" match kapag "read-all" ang pinasa bilang path segment sa ibang setup.
// (Sa Express, hindi ito literal magkaka-conflict dahil magkaiba ang segment count,
// pero pinapanatili natin itong maayos ang pagkakasunod-sunod bilang best practice.)
router.patch("/read-all", async (req, res) => {
  try {
    await q("UPDATE notifications SET is_read = 1 WHERE user_id = :user_id", { user_id: req.user.id });
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /notifications/read-all error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to update notifications" });
  }
});

// PATCH /notifications/:id/read — markahan bilang nabasa (sariling notification lang)
router.patch("/:id/read", async (req, res) => {
  try {
    await q("UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :user_id", {
      id: req.params.id,
      user_id: req.user.id,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /notifications/:id/read error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to update notification" });
  }
});

// DELETE /notifications/:id — burahin ang sariling notification
router.delete("/:id", async (req, res) => {
  try {
    await q("DELETE FROM notifications WHERE id = :id AND user_id = :user_id", {
      id: req.params.id,
      user_id: req.user.id,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /notifications/:id error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to delete notification" });
  }
});

export default router;