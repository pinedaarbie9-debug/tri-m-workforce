// backend/src/routes/employees.js
import { Router } from "express";
import crypto from "node:crypto";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { safeParseJSON, getZodError } from "../utils/helpers.js";
import { logAudit } from "../utils/auditlog.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import { ROLE_GROUPS } from "../utils/roles.js";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateSelfEmployeeSchema,
} from "../validators/businessValidator.js";

const router = Router();
router.use(requireAuth);

const SELECT_EMPLOYEE = `
  SELECT
    e.id, e.employee_code, e.first_name, e.last_name,
    COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)) AS full_name,
    e.email, e.phone, e.job_title, e.department_id, e.employment_type, e.status, e.hire_date, e.avatar_url, e.created_at, e.deleted_at,
    JSON_OBJECT('id', d.id, 'name', d.name, 'code', d.code) AS department
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
`;

// ============================================================
// /me routes — LAHAT ng roles (self-service)
// ============================================================
router.get("/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "No linked employee record." });
    }
    const rows = await q(`${SELECT_EMPLOYEE} WHERE e.id = :id`, {
      id: req.user.employee_id,
    });
    if (!rows[0]) return res.status(404).json({ error: "Employee not found." });
    return res.json({
      ...rows[0],
      department: safeParseJSON(rows[0].department),
    });
  } catch (err) {
    return safeError(res, err, "Failed to fetch profile.");
  }
});

router.patch("/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "No linked employee record." });
    }
    const parsed = updateSelfEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, getZodError(parsed));

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
      return validationError(res, "No updates provided.");
    }

    const setClause = Object.keys(updates)
      .map((k) => `${k} = :${k}`)
      .join(", ");
    await q(`UPDATE employees SET ${setClause} WHERE id = :id`, {
      ...updates,
      id: req.user.employee_id,
    });
    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Failed to update profile.");
  }
});

// ============================================================
// Trash routes — Admin, HR, Supervisor
// ============================================================
router.get(
  "/trash",
  requireRole(...ROLE_GROUPS.EMPLOYEE_MANAGERS),
  async (req, res) => {
    try {
      const rows = await q(`
        ${SELECT_EMPLOYEE}
        WHERE e.deleted_at IS NOT NULL
        ORDER BY e.deleted_at DESC
      `);
      const parsed = rows.map((r) => ({
        ...r,
        department: safeParseJSON(r.department),
      }));
      return res.json(parsed);
    } catch (err) {
      return safeError(res, err, "Failed to fetch deleted employees.");
    }
  }
);

router.post(
  "/:id/restore",
  requireRole(...ROLE_GROUPS.ADMIN_AND_HR),
  async (req, res) => {
    try {
      const existing = await q(
        "SELECT id, full_name, deleted_at FROM employees WHERE id = :id",
        { id: req.params.id }
      );
      if (!existing[0])
        return res.status(404).json({ error: "Employee not found." });
      if (!existing[0].deleted_at) {
        return validationError(res, "Employee is not deleted.");
      }

      await q("UPDATE employees SET deleted_at = NULL WHERE id = :id", {
        id: req.params.id,
      });
      await q("UPDATE users SET status = 'active' WHERE employee_id = :id", {
        id: req.params.id,
      });

      await logAudit({
        userId: req.user.id,
        action: "update",
        module: "employees",
        recordId: req.params.id,
        newValues: { full_name: existing[0].full_name, status: "restored" },
        ip: req.ip,
      });

      return res.json({ ok: true });
    } catch (err) {
      return safeError(res, err, "Failed to restore employee.");
    }
  }
);

router.delete(
  "/:id/permanent",
  requireRole(...ROLE_GROUPS.ADMIN_ONLY),
  async (req, res) => {
    try {
      const existing = await q(
        "SELECT id, full_name, employee_code, deleted_at FROM employees WHERE id = :id",
        { id: req.params.id }
      );
      if (!existing[0])
        return res.status(404).json({ error: "Employee not found." });
      if (!existing[0].deleted_at) {
        return validationError(
          res,
          "Delete the employee first before permanent removal."
        );
      }

      await q("DELETE FROM employees WHERE id = :id", { id: req.params.id });

      await logAudit({
        userId: req.user.id,
        action: "delete",
        module: "employees",
        recordId: req.params.id,
        oldValues: {
          full_name: existing[0].full_name,
          employee_code: existing[0].employee_code,
        },
        ip: req.ip,
      });

      return res.json({ ok: true });
    } catch (err) {
      return safeError(res, err, "Failed to permanently delete employee.");
    }
  }
);

// ============================================================
// CRUD routes — Admin, HR, Supervisor
// ============================================================
router.get(
  "/",
  requireRole(...ROLE_GROUPS.EMPLOYEE_MANAGERS),
  async (req, res) => {
    try {
      const rows = await q(
        `${SELECT_EMPLOYEE} WHERE e.deleted_at IS NULL ORDER BY e.created_at DESC`
      );
      const parsed = rows.map((r) => ({
        ...r,
        department: safeParseJSON(r.department),
      }));
      return res.json(parsed);
    } catch (err) {
      return safeError(res, err, "Failed to fetch employees.");
    }
  }
);

router.get(
  "/:id",
  requireRole(...ROLE_GROUPS.EMPLOYEE_MANAGERS),
  async (req, res) => {
    try {
      const rows = await q(`${SELECT_EMPLOYEE} WHERE e.id = :id`, {
        id: req.params.id,
      });
      if (!rows[0])
        return res.status(404).json({ error: "Employee not found." });
      return res.json({
        ...rows[0],
        department: safeParseJSON(rows[0].department),
      });
    } catch (err) {
      return safeError(res, err, "Failed to fetch employee.");
    }
  }
);

router.post(
  "/",
  requireRole(...ROLE_GROUPS.EMPLOYEE_MANAGERS),
  async (req, res) => {
    try {
      const parsed = createEmployeeSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, getZodError(parsed));

      const {
        first_name,
        last_name,
        email,
        phone,
        job_title,
        department_id,
        employment_type,
        status,
        hire_date,
      } = parsed.data;

      const prefixRows = await q(
        "SELECT value FROM settings WHERE `key` = 'employee_id_prefix'"
      );
      const prefix = prefixRows[0]
        ? safeParseJSON(prefixRows[0].value) ?? "EMP-"
        : "EMP-";

      const countRows = await q(
        "SELECT COUNT(*) AS count FROM employees WHERE employee_code LIKE :pattern",
        { pattern: `${prefix}%` }
      );
      const nextNumber = (countRows[0]?.count ?? 0) + 1;
      const employee_code = `${prefix}${String(nextNumber).padStart(3, "0")}`;

      const id = crypto.randomUUID();
      const full_name = `${first_name} ${last_name}`.trim();

      await q(
        `INSERT INTO employees (id, employee_code, first_name, last_name, full_name, email, phone, job_title, department_id, employment_type, status, hire_date)
         VALUES (:id, :employee_code, :first_name, :last_name, :full_name, :email, :phone, :job_title, :department_id, :employment_type, :status, :hire_date)`,
        {
          id,
          employee_code,
          first_name,
          last_name,
          full_name,
          email,
          phone: phone ?? null,
          job_title: job_title ?? null,
          department_id: department_id || null,
          // 🔒 DEFAULT "regular" kapag walang binigay
          employment_type: employment_type ?? "regular",
          status: status ?? "active",
          hire_date: hire_date || new Date().toISOString().slice(0, 10),
        }
      );

      await logAudit({
        userId: req.user.id,
        action: "create",
        module: "employees",
        recordId: id,
        newValues: { full_name, employee_code, job_title: job_title ?? null },
        ip: req.ip,
      });

      return res.status(201).json({ id, employee_code });
    } catch (err) {
      return safeError(res, err, "Failed to create employee.");
    }
  }
);

router.patch(
  "/:id",
  requireRole(...ROLE_GROUPS.EMPLOYEE_MANAGERS),
  async (req, res) => {
    try {
      const parsed = updateEmployeeSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, getZodError(parsed));

      const updates = parsed.data;
      if (Object.keys(updates).length === 0) {
        return validationError(res, "No updates provided.");
      }

      const before = await q("SELECT full_name FROM employees WHERE id = :id", {
        id: req.params.id,
      });
      if (!before[0])
        return res.status(404).json({ error: "Employee not found." });

      const setClause = Object.keys(updates)
        .map((k) => `${k} = :${k}`)
        .join(", ");
      await q(`UPDATE employees SET ${setClause} WHERE id = :id`, {
        ...updates,
        id: req.params.id,
      });

      const after = await q("SELECT full_name FROM employees WHERE id = :id", {
        id: req.params.id,
      });

      await logAudit({
        userId: req.user.id,
        action: "update",
        module: "employees",
        recordId: req.params.id,
        oldValues: { full_name: before[0].full_name },
        newValues: { full_name: after[0]?.full_name, ...updates },
        ip: req.ip,
      });

      return res.json({ ok: true });
    } catch (err) {
      return safeError(res, err, "Failed to update employee.");
    }
  }
);

router.delete(
  "/:id",
  requireRole(...ROLE_GROUPS.ADMIN_AND_HR),
  async (req, res) => {
    try {
      const existing = await q(
        "SELECT id, full_name, employee_code FROM employees WHERE id = :id",
        { id: req.params.id }
      );
      if (!existing[0])
        return res.status(404).json({ error: "Employee not found." });

      await q("UPDATE employees SET deleted_at = NOW() WHERE id = :id", {
        id: req.params.id,
      });
      await q("UPDATE users SET status = 'inactive' WHERE employee_id = :id", {
        id: req.params.id,
      });
      await q(
        "UPDATE biometric_credentials SET is_active = FALSE WHERE employee_id = :id",
        { id: req.params.id }
      );

      await logAudit({
        userId: req.user.id,
        action: "delete",
        module: "employees",
        recordId: req.params.id,
        oldValues: {
          full_name: existing[0].full_name,
          employee_code: existing[0].employee_code,
        },
        ip: req.ip,
      });

      return res.json({ ok: true });
    } catch (err) {
      return safeError(res, err, "Failed to delete employee.");
    }
  }
);

export default router;