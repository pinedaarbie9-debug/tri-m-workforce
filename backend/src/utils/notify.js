// backend/src/utils/notify.js
// Shared notification helper — para sa lahat ng routes na kailangang mag-notify.

import crypto from "node:crypto";
import { q } from "../db.js";

/**
 * Mag-create ng notification para sa isang specific user.
 */
export async function notifyUser(userId, { type, title, message, link = null }) {
  if (!userId) return;
  try {
    await q(
      "INSERT INTO notifications (id, user_id, type, title, message, is_read) VALUES (:id, :user_id, :type, :title, :message, 0)",
      { id: crypto.randomUUID(), user_id: userId, type, title, message }
    );
  } catch (err) {
    console.error("notifyUser error:", err);
  }
}

/**
 * Mag-notify sa lahat ng users na may role na admin/hr_manager/supervisor.
 */
export async function notifyAdmins({ type, title, message }) {
  try {
    const admins = await q(
      "SELECT id FROM users WHERE role IN ('admin','hr_manager','supervisor') AND status = 'active'"
    );
    for (const admin of admins) {
      await q(
        "INSERT INTO notifications (id, user_id, type, title, message, is_read) VALUES (:id, :user_id, :type, :title, :message, 0)",
        { id: crypto.randomUUID(), user_id: admin.id, type, title, message }
      );
    }
  } catch (err) {
    console.error("notifyAdmins error:", err);
  }
}

/**
 * Mag-notify sa lahat ng active users (para sa announcements/system-wide).
 */
export async function notifyAllUsers({ type, title, message }) {
  try {
    const users = await q("SELECT id FROM users WHERE status = 'active'");
    for (const u of users) {
      await q(
        "INSERT INTO notifications (id, user_id, type, title, message, is_read) VALUES (:id, :user_id, :type, :title, :message, 0)",
        { id: crypto.randomUUID(), user_id: u.id, type, title, message }
      );
    }
  } catch (err) {
    console.error("notifyAllUsers error:", err);
  }
}

/**
 * Mag-notify sa employee owner (base sa employee_id → users.id).
 */
export async function notifyEmployeeOwner(employeeId, { type, title, message }) {
  if (!employeeId) return;
  try {
    const rows = await q(
      "SELECT id FROM users WHERE employee_id = :employee_id LIMIT 1",
      { employee_id: employeeId }
    );
    if (!rows[0]) return;
    await q(
      "INSERT INTO notifications (id, user_id, type, title, message, is_read) VALUES (:id, :user_id, :type, :title, :message, 0)",
      { id: crypto.randomUUID(), user_id: rows[0].id, type, title, message }
    );
  } catch (err) {
    console.error("notifyEmployeeOwner error:", err);
  }
}