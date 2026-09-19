// backend/src/routes/users.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditlog.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import { ROLE_GROUPS } from "../utils/roles.js";

const router = Router();
router.use(requireAuth);
router.use(requireRole(...ROLE_GROUPS.ADMIN_ONLY));

function getZodError(parsed) {
  const issues = parsed?.error?.issues ?? parsed?.error?.errors ?? [];
  return issues[0]?.message ?? "Invalid input.";
}

function isStrongPassword(password) {
  if (typeof password !== "string" || password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const VALID_ROLES = ["admin", "hr_manager", "supervisor", "employee"];

router.get("/", async (req, res) => {
  try {
    const rows = await q(`
      SELECT
        u.id, u.full_name, u.email, u.role, u.status, u.last_login, u.created_at,
        u.employee_id,
        d.name AS department
      FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      ORDER BY u.created_at DESC
    `);
    return res.json(rows);
  } catch (err) {
    return safeError(res, err, "Failed to fetch users.");
  }
});

router.post("/", async (req, res) => {
  try {
    const { full_name, email, password, role, employee_id, status } = req.body;

    if (!full_name || typeof full_name !== "string" || !full_name.trim()) {
      return validationError(res, "Full name is required.");
    }
    if (!email || !isValidEmail(email)) {
      return validationError(res, "Valid email is required.");
    }
    if (!password) {
      return validationError(res, "Password is required.");
    }
    if (!isStrongPassword(password)) {
      return validationError(
        res,
        "Password must be at least 8 characters with uppercase, lowercase, and a number."
      );
    }

    const finalRole = role ?? "employee";
    if (!VALID_ROLES.includes(finalRole)) {
      return validationError(res, "Invalid role.");
    }

    if (finalRole === "employee" && !employee_id) {
      return validationError(
        res,
        "Employee role requires a linked employee record."
      );
    }

    const existing = await q(
      "SELECT id FROM users WHERE email = :email LIMIT 1",
      { email: email.toLowerCase().trim() }
    );
    if (existing[0]) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    }

    const id = crypto.randomUUID();
    const password_hash = await bcrypt.hash(password, 10);

    await q(
      `INSERT INTO users (id, full_name, email, password_hash, role, employee_id, status)
       VALUES (:id, :full_name, :email, :password_hash, :role, :employee_id, :status)`,
      {
        id,
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        password_hash,
        role: finalRole,
        employee_id: employee_id || null,
        status: status ?? "active",
      }
    );

    await logAudit({
      userId: req.user.id,
      action: "create",
      module: "users",
      recordId: id,
      newValues: { full_name, email, role: finalRole },
      ip: req.ip,
    });

    return res.status(201).json({ id });
  } catch (err) {
    return safeError(res, err, "Failed to create user.");
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const targetId = req.params.id;

    const allowedFields = [
      "full_name",
      "email",
      "role",
      "status",
      "employee_id",
    ];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (targetId === req.user.id) {
      if (updates.role && updates.role !== req.user.role) {
        return res
          .status(403)
          .json({ error: "You cannot change your own role." });
      }
      if (updates.status && updates.status !== "active") {
        return res
          .status(403)
          .json({ error: "You cannot suspend your own account." });
      }
    }

    if (updates.role && !VALID_ROLES.includes(updates.role)) {
      return validationError(res, "Invalid role.");
    }

    if (updates.email) {
      if (!isValidEmail(updates.email)) {
        return validationError(res, "Valid email is required.");
      }
      updates.email = updates.email.toLowerCase().trim();
    }

    if (req.body.password) {
      if (!isStrongPassword(req.body.password)) {
        return validationError(
          res,
          "Password must be at least 8 characters with uppercase, lowercase, and a number."
        );
      }
      updates.password_hash = await bcrypt.hash(req.body.password, 10);
      updates.failed_login_attempts = 0;
      updates.locked_until = null;
    }

    if (Object.keys(updates).length === 0) {
      return validationError(res, "No updates provided.");
    }

    if (updates.email) {
      const existing = await q(
        "SELECT id FROM users WHERE email = :email AND id != :id LIMIT 1",
        { email: updates.email, id: targetId }
      );
      if (existing[0]) {
        return res
          .status(409)
          .json({ error: "Another account is using this email." });
      }
    }

    const before = await q(
      "SELECT full_name, role, status, employee_id FROM users WHERE id = :id",
      { id: targetId }
    );
    if (!before[0]) {
      return res.status(404).json({ error: "User not found." });
    }

    const isDemotingAdmin =
      before[0].role === "admin" &&
      updates.role &&
      updates.role !== "admin";
    const isSuspendingAdmin =
      before[0].role === "admin" &&
      updates.status &&
      updates.status !== "active";

    if (isDemotingAdmin || isSuspendingAdmin) {
      const adminCount = await q(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'active'"
      );
      if (Number(adminCount[0].count) <= 1) {
        return res.status(403).json({
          error: "Cannot demote or suspend the last active admin.",
        });
      }
    }

    const setClause = Object.keys(updates)
      .map((k) => `${k} = :${k}`)
      .join(", ");
    await q(`UPDATE users SET ${setClause} WHERE id = :id`, {
      ...updates,
      id: targetId,
    });

    const finalEmployeeId =
      updates.employee_id !== undefined
        ? updates.employee_id
        : before[0].employee_id;
    const becomingActive =
      updates.status === "active" && before[0].status !== "active";

    if (becomingActive && finalEmployeeId) {
      const empRows = await q(
        "SELECT id, full_name, deleted_at FROM employees WHERE id = :id",
        { id: finalEmployeeId }
      );
      if (empRows[0] && empRows[0].deleted_at) {
        await q("UPDATE employees SET deleted_at = NULL WHERE id = :id", {
          id: finalEmployeeId,
        });

        await logAudit({
          userId: req.user.id,
          action: "update",
          module: "employees",
          recordId: finalEmployeeId,
          oldValues: { status: "deleted" },
          newValues: {
            full_name: empRows[0].full_name,
            status: "restored (auto via user activation)",
          },
          ip: req.ip,
        });
      }
    }

    await logAudit({
      userId: req.user.id,
      action: "update",
      module: "users",
      recordId: targetId,
      oldValues: { full_name: before[0].full_name, role: before[0].role },
      newValues: {
        full_name: updates.full_name ?? before[0].full_name,
        role: updates.role ?? before[0].role,
        status: updates.status,
      },
      ip: req.ip,
    });

    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Failed to update user.");
  }
});

export default router;