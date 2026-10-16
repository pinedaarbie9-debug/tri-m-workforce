// backend/src/utils/notify.js
import crypto from "node:crypto";
import { q } from "../db.js";

const INSERT_SQL =
  "INSERT INTO notifications (id, user_id, type, title, message, is_read) VALUES (:id, :user_id, :type, :title, :message, FALSE)";

async function insertFor(userId, { type, title, message }) {
  await q(INSERT_SQL, { id: crypto.randomUUID(), user_id: userId, type, title, message });
}

export async function notifyUser(userId, { type, title, message }) {
  if (!userId) return;
  try {
    await insertFor(userId, { type, title, message });
  } catch (err) {
    console.error("notifyUser error:", err);
  }
}

export async function notifyAdmins({ type, title, message }) {
  try {
    const admins = await q(
      "SELECT id FROM users WHERE role IN ('admin','hr_manager','supervisor') AND status = 'active'"
    );
    for (const admin of admins) await insertFor(admin.id, { type, title, message });
  } catch (err) {
    console.error("notifyAdmins error:", err);
  }
}

export async function notifyAllUsers({ type, title, message }) {
  try {
    const users = await q("SELECT id FROM users WHERE status = 'active'");
    for (const u of users) await insertFor(u.id, { type, title, message });
  } catch (err) {
    console.error("notifyAllUsers error:", err);
  }
}

export async function notifyEmployeeOwner(employeeId, { type, title, message }) {
  if (!employeeId) return;
  try {
    const rows = await q("SELECT id FROM users WHERE employee_id = :employee_id LIMIT 1", {
      employee_id: employeeId,
    });
    if (!rows[0]) return;
    await insertFor(rows[0].id, { type, title, message });
  } catch (err) {
    console.error("notifyEmployeeOwner error:", err);
  }
}