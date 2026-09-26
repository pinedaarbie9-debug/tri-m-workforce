// backend/src/routes/biometric.js
import { Router } from "express";
import crypto from "node:crypto";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { safeParseJSON, getZodError } from "../utils/helpers.js";
import { logAudit } from "../utils/auditlog.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import { ROLE_GROUPS } from "../utils/roles.js";
import {
  createBiometricSchema,
  updateBiometricSchema,
} from "../validators/businessValidator.js";

const router = Router();
router.use(requireAuth);

// GET /biometric-credentials — MANAGEMENT (view)
router.get(
  "/",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const includeInactive = req.query.include_inactive === "true";
      const rows = await q(`
        SELECT
          b.id, b.employee_id, b.device_type, b.device_name, b.credential_id,
          b.is_active, b.registered_at,
          JSON_OBJECT(
            'id', e.id,
            'full_name', COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)),
            'employee_code', e.employee_code,
            'avatar_url', e.avatar_url
          ) AS employee
        FROM biometric_credentials b
        JOIN employees e ON e.id = b.employee_id
        ${includeInactive ? "" : "WHERE b.is_active = TRUE"}
        ORDER BY b.registered_at DESC
      `);
      return res.json(
        rows.map((r) => ({
          ...r,
          employee: safeParseJSON(r.employee),
          is_active: !!r.is_active,
        }))
      );
    } catch (err) {
      return safeError(res, err, "Failed to fetch credentials.");
    }
  }
);

// GET /biometric-credentials/employee-count — MANAGEMENT
router.get(
  "/employee-count",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const rows = await q(
        "SELECT COUNT(*) AS count FROM employees WHERE deleted_at IS NULL"
      );
      return res.json({ count: rows[0].count });
    } catch (err) {
      return safeError(res, err, "Failed to fetch employee count.");
    }
  }
);

// GET /biometric-credentials/stats — MANAGEMENT
router.get(
  "/stats",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const [[{ totalEmployees }]] = [
        await q(
          "SELECT COUNT(*) AS totalEmployees FROM employees WHERE status = 'active' AND deleted_at IS NULL"
        ),
      ];
      const [[{ enrolledEmployees }]] = [
        await q(`
          SELECT COUNT(DISTINCT b.employee_id) AS enrolledEmployees
          FROM biometric_credentials b
          JOIN employees e ON e.id = b.employee_id
          WHERE b.is_active = TRUE AND e.status = 'active' AND e.deleted_at IS NULL
        `),
      ];
      const [[{ totalCredentials }]] = [
        await q(
          "SELECT COUNT(*) AS totalCredentials FROM biometric_credentials WHERE is_active = TRUE"
        ),
      ];

      const pendingEmployees = Math.max(0, totalEmployees - enrolledEmployees);
      const enrollmentRate =
        totalEmployees > 0
          ? Math.round((enrolledEmployees / totalEmployees) * 100)
          : 0;

      return res.json({
        totalEmployees,
        enrolledEmployees,
        pendingEmployees,
        totalCredentials,
        enrollmentRate,
      });
    } catch (err) {
      return safeError(res, err, "Failed to fetch biometric stats.");
    }
  }
);

// GET /biometric-credentials/pending — MANAGEMENT
router.get(
  "/pending",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const rows = await q(`
        SELECT
          e.id, e.employee_code,
          COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)) AS full_name,
          e.job_title, e.avatar_url,
          d.name AS department
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.status = 'active'
          AND e.deleted_at IS NULL
          AND e.id NOT IN (
            SELECT DISTINCT employee_id FROM biometric_credentials WHERE is_active = TRUE
          )
        ORDER BY e.full_name ASC
      `);
      return res.json(rows);
    } catch (err) {
      return safeError(res, err, "Failed to fetch pending employees.");
    }
  }
);

// GET /biometric-credentials/me/face-descriptor
router.get("/me/face-descriptor", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "No linked employee record." });
    }
    const rows = await q(
      `SELECT face_descriptor FROM biometric_credentials
       WHERE employee_id = :employee_id AND device_type = 'face_id' AND is_active = TRUE
       ORDER BY registered_at DESC LIMIT 1`,
      { employee_id: req.user.employee_id }
    );
    if (!rows[0] || !rows[0].face_descriptor) {
      return res.status(404).json({
        error: "No Face ID enrolled. Please enroll in Biometric Auth.",
      });
    }
    return res.json({ face_descriptor: safeParseJSON(rows[0].face_descriptor) });
  } catch (err) {
    return safeError(res, err, "Failed to fetch face descriptor.");
  }
});

// GET /biometric-credentials/generate-pin — ADMIN_AND_HR
router.get(
  "/generate-pin",
  requireRole(...ROLE_GROUPS.ADMIN_AND_HR),
  async (req, res) => {
    try {
      const pin = await generateUniquePin();
      return res.json({ credential_id: pin });
    } catch (err) {
      if (err.message === "PIN_GENERATION_FAILED") {
        return res
          .status(500)
          .json({ error: "Could not generate unique PIN. Try again." });
      }
      return safeError(res, err, "Failed to generate PIN.");
    }
  }
);

async function getEmployeeName(employee_id) {
  const rows = await q(
    `SELECT COALESCE(NULLIF(full_name, ''), CONCAT(first_name, ' ', last_name)) AS full_name
     FROM employees WHERE id = :employee_id`,
    { employee_id }
  );
  return rows[0]?.full_name ?? null;
}

async function checkPinConflict(credential_id, excludeId = null) {
  if (!credential_id) return null;
  const rows = await q(
    `SELECT id FROM biometric_credentials
     WHERE device_type = 'fingerprint' AND credential_id = :credential_id AND is_active = TRUE
       ${excludeId ? "AND id != :excludeId" : ""}`,
    excludeId ? { credential_id, excludeId } : { credential_id }
  );
  return rows.length ? rows[0].id : null;
}

async function generateUniquePin(length = 4) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  let pin;
  let attempts = 0;
  do {
    pin = String(Math.floor(min + Math.random() * (max - min + 1)));
    attempts++;
    if (attempts > 50) throw new Error("PIN_GENERATION_FAILED");
  } while (await checkPinConflict(pin));
  return pin;
}

// POST /biometric-credentials — ADMIN_AND_HR
router.post(
  "/",
  requireRole(...ROLE_GROUPS.ADMIN_AND_HR),
  async (req, res) => {
    try {
      const parsed = createBiometricSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, getZodError(parsed));

      const {
        employee_id,
        device_type,
        device_name,
        photo_data,
        face_descriptor,
      } = parsed.data;
      let { credential_id } = parsed.data;

      const existingForEmployee = await q(
        `SELECT id FROM biometric_credentials
         WHERE employee_id = :employee_id AND device_type = :device_type AND is_active = TRUE`,
        { employee_id, device_type }
      );
      if (existingForEmployee.length) {
        return res.status(409).json({
          error: `Employee already has an active ${device_type} credential.`,
          existing_id: existingForEmployee[0].id,
        });
      }

      if (device_type === "fingerprint") {
        if (!credential_id || !String(credential_id).trim()) {
          credential_id = await generateUniquePin();
        } else {
          credential_id = String(credential_id).trim();
          if (!/^[0-9]{3,10}$/.test(credential_id)) {
            return validationError(res, "Device PIN must be 3-10 digits.");
          }
          const conflictId = await checkPinConflict(credential_id);
          if (conflictId) {
            return res.status(409).json({
              error: `Device PIN "${credential_id}" is already in use.`,
            });
          }
        }
      }

      const id = crypto.randomUUID();
      await q(
        `INSERT INTO biometric_credentials (id, employee_id, device_type, device_name, photo_data, face_descriptor, credential_id, is_active)
         VALUES (:id, :employee_id, :device_type, :device_name, :photo_data, :face_descriptor, :credential_id, TRUE)`,
        {
          id,
          employee_id,
          device_type,
          device_name: device_name || null,
          photo_data: photo_data || null,
          face_descriptor: face_descriptor
            ? JSON.stringify(face_descriptor)
            : null,
          credential_id: credential_id || "",
        }
      );

      if (device_type === "face_id" && photo_data) {
        await q(
          `UPDATE employees SET avatar_url = :photo_data WHERE id = :employee_id`,
          { photo_data, employee_id }
        );
      }

      const employeeName = await getEmployeeName(employee_id);
      await logAudit({
        userId: req.user.id,
        action: "create",
        module: "biometric_credentials",
        recordId: id,
        newValues: {
          full_name: employeeName,
          device_type,
          credential_id: credential_id || null,
        },
        ip: req.ip,
      });

      return res.status(201).json({ id, credential_id });
    } catch (err) {
      return safeError(res, err, "Failed to enroll device.");
    }
  }
);

// PUT /biometric-credentials/:id — ADMIN_AND_HR
router.put(
  "/:id",
  requireRole(...ROLE_GROUPS.ADMIN_AND_HR),
  async (req, res) => {
    try {
      const parsed = updateBiometricSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, getZodError(parsed));

      const { id } = req.params;
      const { device_name, photo_data, face_descriptor, is_active } = parsed.data;
      let { credential_id } = parsed.data;

      const rows = await q(
        "SELECT * FROM biometric_credentials WHERE id = :id",
        { id }
      );
      if (!rows[0])
        return res.status(404).json({ error: "Credential not found." });
      const current = rows[0];

      if (
        current.device_type === "fingerprint" &&
        credential_id !== undefined &&
        credential_id !== current.credential_id
      ) {
        credential_id = String(credential_id).trim();
        if (credential_id && !/^[0-9]{3,10}$/.test(credential_id)) {
          return validationError(res, "Device PIN must be 3-10 digits.");
        }
        if (credential_id) {
          const conflictId = await checkPinConflict(credential_id, id);
          if (conflictId) {
            return res.status(409).json({
              error: `Device PIN "${credential_id}" is already in use.`,
            });
          }
        }
      }

      await q(
        `UPDATE biometric_credentials
         SET device_name = :device_name,
             photo_data = :photo_data,
             face_descriptor = :face_descriptor,
             credential_id = :credential_id,
             is_active = :is_active
         WHERE id = :id`,
        {
          id,
          device_name: device_name ?? current.device_name,
          photo_data: photo_data ?? current.photo_data,
          face_descriptor: face_descriptor
            ? JSON.stringify(face_descriptor)
            : current.face_descriptor,
          credential_id: credential_id ?? current.credential_id,
          is_active: is_active ?? current.is_active,
        }
      );

      if (current.device_type === "face_id" && photo_data) {
        await q(
          `UPDATE employees SET avatar_url = :photo_data WHERE id = :employee_id`,
          {
            photo_data,
            employee_id: current.employee_id,
          }
        );
      }

      const employeeName = await getEmployeeName(current.employee_id);
      await logAudit({
        userId: req.user.id,
        action: "update",
        module: "biometric_credentials",
        recordId: id,
        oldValues: {
          full_name: employeeName,
          device_type: current.device_type,
          credential_id: current.credential_id,
        },
        newValues: {
          full_name: employeeName,
          device_type: current.device_type,
          credential_id: credential_id ?? current.credential_id,
        },
        ip: req.ip,
      });

      return res.json({ success: true });
    } catch (err) {
      return safeError(res, err, "Failed to update credential.");
    }
  }
);

// DELETE /biometric-credentials/clear-all — ADMIN_ONLY
router.delete(
  "/clear-all",
  requireRole(...ROLE_GROUPS.ADMIN_ONLY),
  async (req, res) => {
    try {
      const hard = req.query.hard === "true";
      if (req.query.confirm !== "true") {
        return validationError(
          res,
          "?confirm=true is required to clear ALL credentials."
        );
      }

      const existing = await q("SELECT id FROM biometric_credentials");
      const affectedCount = existing.length;

      if (hard) {
        await q("DELETE FROM biometric_credentials");
      } else {
        await q(
          "UPDATE biometric_credentials SET is_active = FALSE WHERE is_active = TRUE"
        );
      }

      await logAudit({
        userId: req.user.id,
        action: "delete",
        module: "biometric_credentials",
        recordId: null,
        oldValues: {
          scope: "ALL_CREDENTIALS",
          deletion_type: hard ? "permanent" : "deactivated",
          affected_count: affectedCount,
        },
        ip: req.ip,
      });

      return res.json({ success: true, hard, cleared: affectedCount });
    } catch (err) {
      return safeError(res, err, "Failed to clear all credentials.");
    }
  }
);

// DELETE /biometric-credentials/:id — ADMIN_ONLY
router.delete("/:id", requireRole(...ROLE_GROUPS.ADMIN_ONLY), async (req, res) => {
  try {
    const { id } = req.params;
    const hard = req.query.hard === "true";

    const rows = await q("SELECT * FROM biometric_credentials WHERE id = :id", {
      id,
    });
    if (!rows[0])
      return res.status(404).json({ error: "Credential not found." });
    const current = rows[0];

    if (hard) {
      await q("DELETE FROM biometric_credentials WHERE id = :id", { id });
    } else {
      await q(
        "UPDATE biometric_credentials SET is_active = FALSE WHERE id = :id",
        { id }
      );
    }

    const employeeName = await getEmployeeName(current.employee_id);
    await logAudit({
      userId: req.user.id,
      action: "delete",
      module: "biometric_credentials",
      recordId: id,
      oldValues: {
        full_name: employeeName,
        device_type: current.device_type,
        credential_id: current.credential_id,
        deletion_type: hard ? "permanent" : "deactivated",
      },
      ip: req.ip,
    });

    return res.json({ success: true, hard });
  } catch (err) {
    return safeError(res, err, "Failed to delete credential.");
  }
});

export default router;