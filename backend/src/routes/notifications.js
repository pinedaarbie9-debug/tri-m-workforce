// backend/src/routes/notifications.js
import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { safeError } from "../utils/errorResponse.js";

const router = Router();
router.use(requireAuth);

// ============================================================
// GET /notifications
// ============================================================
router.get("/", async (req, res) => {
  try {
    const rows = await q(
      "SELECT * FROM notifications WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 100",
      { user_id: req.user.id }
    );
    return res.json(rows.map((r) => ({ ...r, is_read: !!r.is_read })));
  } catch (err) {
    return safeError(res, err, "Failed to fetch notifications.");
  }
});

// ============================================================
// GET /notifications/unread-count
// ============================================================
router.get("/unread-count", async (req, res) => {
  try {
    const rows = await q(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = :user_id AND is_read = 0",
      { user_id: req.user.id }
    );
    return res.json({ count: rows[0]?.count ?? 0 });
  } catch (err) {
    return safeError(res, err, "Failed to fetch unread count.");
  }
});

// ============================================================
// GET /notifications/me — alias
// ============================================================
router.get("/me", async (req, res) => {
  try {
    const rows = await q(
      "SELECT * FROM notifications WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 100",
      { user_id: req.user.id }
    );
    return res.json(rows.map((r) => ({ ...r, is_read: !!r.is_read })));
  } catch (err) {
    return safeError(res, err, "Failed to fetch notifications.");
  }
});

// ============================================================
// PATCH /notifications/read-all
// ============================================================
router.patch("/read-all", async (req, res) => {
  try {
    await q(
      "UPDATE notifications SET is_read = 1 WHERE user_id = :user_id",
      { user_id: req.user.id }
    );
    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Failed to update notifications.");
  }
});

// ============================================================
// PATCH /notifications/:id/read
// ============================================================
router.patch("/:id/read", async (req, res) => {
  try {
    await q(
      "UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :user_id",
      { id: req.params.id, user_id: req.user.id }
    );
    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Failed to update notification.");
  }
});

// ============================================================
// DELETE /notifications/:id
// ============================================================
router.delete("/:id", async (req, res) => {
  try {
    await q(
      "DELETE FROM notifications WHERE id = :id AND user_id = :user_id",
      { id: req.params.id, user_id: req.user.id }
    );
    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Failed to delete notification.");
  }
});

export default router;