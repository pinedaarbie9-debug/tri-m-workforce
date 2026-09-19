// backend/src/routes/departments.js
import { Router } from "express";
import crypto from "node:crypto";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole, getZodError } from "../utils/helpers.js";
import { logAudit } from "../utils/auditlog.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from "../validators/businessValidator.js";

const router = Router();
router.use(requireAuth);

// ============================================================
// GET /departments — lahat ng authenticated users
// ============================================================
router.get("/", async (req, res) => {
  try {
    const rows = await q(`
      SELECT d.*,
        (SELECT COUNT(*) FROM employees e
         WHERE e.department_id = d.id AND e.status = 'active' AND e.deleted_at IS NULL) AS head_count
      FROM departments d
      ORDER BY d.name ASC
    `);
    return res.json(rows);
  } catch (err) {
    return safeError(res, err, "Failed to fetch departments.");
  }
});

// ============================================================
// GET /departments/:id
// ============================================================
router.get("/:id", async (req, res) => {
  try {
    const rows = await q(
      `SELECT d.*,
        (SELECT COUNT(*) FROM employees e
         WHERE e.department_id = d.id AND e.status = 'active' AND e.deleted_at IS NULL) AS head_count
       FROM departments d WHERE d.id = :id`,
      { id: req.params.id }
    );
    if (!rows[0]) return res.status(404).json({ error: "Department not found." });
    return res.json(rows[0]);
  } catch (err) {
    return safeError(res, err, "Failed to fetch department.");
  }
});

// ============================================================
// POST /departments — admin/manager only
// ============================================================
router.post("/", requireRole("admin", "manager"), async (req, res) => {
  try {
    const parsed = createDepartmentSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { name, code, manager, color } = parsed.data;

    // 🔒 Check uniqueness ng code
    const existing = await q(
      "SELECT id FROM departments WHERE code = :code LIMIT 1",
      { code }
    );
    if (existing[0]) {
      return res.status(409).json({ error: "Department code already exists." });
    }

    const id = crypto.randomUUID();
    await q(
      `INSERT INTO departments (id, name, code, manager, color)
       VALUES (:id, :name, :code, :manager, :color)`,
      { id, name, code, manager: manager || null, color: color ?? "#7c3aed" }
    );

    await logAudit({
      userId: req.user.id,
      action: "create",
      module: "departments",
      recordId: id,
      newValues: { name, code, manager, color },
      ip: req.ip,
    });

    return res.status(201).json({ id });
  } catch (err) {
    return safeError(res, err, "Failed to create department.");
  }
});

// ============================================================
// PATCH /departments/:id — admin/manager only
// ============================================================
router.patch("/:id", requireRole("admin", "manager"), async (req, res) => {
  try {
    const parsed = updateDepartmentSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const updates = parsed.data;

    if (Object.keys(updates).length === 0) {
      return validationError(res, "No updates provided.");
    }

    const existing = await q(
      "SELECT id, name FROM departments WHERE id = :id",
      { id: req.params.id }
    );
    if (!existing[0]) return res.status(404).json({ error: "Department not found." });

    // 🔒 Code uniqueness check kung binabago
    if (updates.code) {
      const codeCheck = await q(
        "SELECT id FROM departments WHERE code = :code AND id != :id LIMIT 1",
        { code: updates.code, id: req.params.id }
      );
      if (codeCheck[0]) {
        return res.status(409).json({ error: "Department code already exists." });
      }
    }

    const setClause = Object.keys(updates).map((k) => `${k} = :${k}`).join(", ");
    await q(`UPDATE departments SET ${setClause} WHERE id = :id`, {
      ...updates,
      id: req.params.id,
    });

    await logAudit({
      userId: req.user.id,
      action: "update",
      module: "departments",
      recordId: req.params.id,
      oldValues: { name: existing[0].name },
      newValues: updates,
      ip: req.ip,
    });

    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Failed to update department.");
  }
});

// ============================================================
// DELETE /departments/:id — admin only
// ============================================================
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const existing = await q(
      "SELECT id, name FROM departments WHERE id = :id",
      { id: req.params.id }
    );
    if (!existing[0]) return res.status(404).json({ error: "Department not found." });

    const headcount = await q(
      "SELECT COUNT(*) AS count FROM employees WHERE department_id = :id AND deleted_at IS NULL",
      { id: req.params.id }
    );
    if ((headcount[0]?.count ?? 0) > 0) {
      return validationError(
        res,
        `Cannot delete department — ${headcount[0].count} employee(s) still assigned. Reassign them first.`
      );
    }

    await q("DELETE FROM departments WHERE id = :id", { id: req.params.id });

    await logAudit({
      userId: req.user.id,
      action: "delete",
      module: "departments",
      recordId: req.params.id,
      oldValues: { name: existing[0].name },
      ip: req.ip,
    });

    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Failed to delete department.");
  }
});

export default router;