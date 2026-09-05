import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /biometric-credentials
router.get("/", async (req, res) => {
  try {
    const rows = await q(`
      SELECT
        b.*,
        JSON_OBJECT(
          'id', e.id,
          'full_name', COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)),
          'employee_code', e.employee_code,
          'avatar_url', e.avatar_url
        ) AS employee
      FROM biometric_credentials b
      JOIN employees e ON e.id = b.employee_id
      ORDER BY b.registered_at DESC
    `);
    res.json(rows.map((r) => ({ ...r, employee: JSON.parse(r.employee), is_active: !!r.is_active })));
  } catch (err) {
    console.error("GET /biometric-credentials error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch credentials" });
  }
});

// GET /biometric-credentials/employee-count
router.get("/employee-count", async (req, res) => {
  try {
    const rows = await q("SELECT COUNT(*) AS count FROM employees");
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error("GET /biometric-credentials/employee-count error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch employee count" });
  }
});

// GET /biometric-credentials/stats
router.get("/stats", async (req, res) => {
  try {
    const [[{ totalEmployees }]] = [
      await q("SELECT COUNT(*) AS totalEmployees FROM employees WHERE status = 'active'"),
    ];
    const [[{ enrolledEmployees }]] = [
      await q(`
        SELECT COUNT(DISTINCT b.employee_id) AS enrolledEmployees
        FROM biometric_credentials b
        JOIN employees e ON e.id = b.employee_id
        WHERE b.is_active = TRUE AND e.status = 'active'
      `),
    ];
    const [[{ totalCredentials }]] = [
      await q("SELECT COUNT(*) AS totalCredentials FROM biometric_credentials WHERE is_active = TRUE"),
    ];

    const pendingEmployees = Math.max(0, totalEmployees - enrolledEmployees);
    const enrollmentRate = totalEmployees > 0 ? Math.round((enrolledEmployees / totalEmployees) * 100) : 0;

    res.json({
      totalEmployees,
      enrolledEmployees,
      pendingEmployees,
      totalCredentials,
      enrollmentRate,
    });
  } catch (err) {
    console.error("GET /biometric-credentials/stats error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch biometric stats" });
  }
});

// GET /biometric-credentials/pending
router.get("/pending", async (req, res) => {
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
        AND e.id NOT IN (
          SELECT DISTINCT employee_id FROM biometric_credentials WHERE is_active = TRUE
        )
      ORDER BY e.full_name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /biometric-credentials/pending error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch pending employees" });
  }
});

// GET /biometric-credentials/me/face-descriptor
router.get("/me/face-descriptor", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "Walang naka-link na employee record sa account na ito." });
    }
    const rows = await q(
      `SELECT face_descriptor FROM biometric_credentials
       WHERE employee_id = :employee_id AND device_type = 'face_id' AND is_active = TRUE
       ORDER BY registered_at DESC LIMIT 1`,
      { employee_id: req.user.employee_id }
    );
    if (!rows[0] || !rows[0].face_descriptor) {
      return res.status(404).json({ error: "Wala kang naka-enroll na Face ID. Pumunta sa Biometric Auth para mag-enroll." });
    }
    res.json({ face_descriptor: JSON.parse(rows[0].face_descriptor) });
  } catch (err) {
    console.error("GET /biometric-credentials/me/face-descriptor error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch face descriptor" });
  }
});

// -----------------------------------------------------------------------
// Helper: i-check kung may PIN conflict sa ibang employee.
// `excludeId` — opsyonal, gamitin sa PUT (edit) para hindi mag-conflict
// sa sarili nitong record.
// -----------------------------------------------------------------------
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

// POST /biometric-credentials — Enroll Device
//
// PATAKARAN: isang ACTIVE credential lang kada employee KADA device_type.
// Ibig sabihin, isang active fingerprint AT isang active face_id ang
// pwedeng magkasabay sa isang employee, pero hindi dalawang active
// fingerprint credential. Kung gusto ng admin na palitan ang PIN o litrato,
// gamitin ang PUT /:id (edit) sa halip na mag-enroll ulit, o i-DELETE muna
// ang luma.
router.post("/", async (req, res) => {
  try {
    const { employee_id, device_type, device_name, photo_data, face_descriptor, credential_id } = req.body;
    if (!employee_id || !device_type) {
      return res.status(400).json({ error: "Kailangan ng employee at device type." });
    }

    // CHECK 1: isang active credential lang kada employee kada device_type
    // (fingerprint man o face_id).
    const existingForEmployee = await q(
      `SELECT id FROM biometric_credentials
       WHERE employee_id = :employee_id AND device_type = :device_type AND is_active = TRUE`,
      { employee_id, device_type }
    );
    if (existingForEmployee.length) {
      return res.status(409).json({
        error: `May aktibo nang ${device_type} credential ang empleyadong ito. I-edit o i-delete muna ang luma bago mag-enroll ulit.`,
        existing_id: existingForEmployee[0].id,
      });
    }

    // CHECK 2: hindi dapat magkatabi ang dalawang tao sa iisang Device PIN.
    if (device_type === "fingerprint") {
      const conflictId = await checkPinConflict(credential_id);
      if (conflictId) {
        return res.status(409).json({ error: `Ginagamit na ang Device PIN "${credential_id}" ng ibang empleyado.` });
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
        face_descriptor: face_descriptor ? JSON.stringify(face_descriptor) : null,
        credential_id: credential_id || "",
      }
    );

    if (device_type === "face_id" && photo_data) {
      await q(`UPDATE employees SET avatar_url = :photo_data WHERE id = :employee_id`, { photo_data, employee_id });
    }

    await q(
      "INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'create','biometric_credentials',:rid,:ip)",
      { uid: req.user.id, rid: id, ip: req.ip }
    );
    res.status(201).json({ id });
  } catch (err) {
    console.error("POST /biometric-credentials error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to enroll device" });
  }
});

// -----------------------------------------------------------------------
// PUT /biometric-credentials/:id — EDIT
// Gamitin ito para palitan ang Device PIN, device_name, litrato, o
// face_descriptor ng isang existing credential — imbes na mag-enroll
// ng bago. Hindi ginagalaw ang employee_id o device_type dito (kung
// gusto palitan ang device_type, mag-delete at mag-enroll ulit).
// -----------------------------------------------------------------------
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { device_name, photo_data, face_descriptor, credential_id, is_active } = req.body;

    const rows = await q("SELECT * FROM biometric_credentials WHERE id = :id", { id });
    if (!rows[0]) {
      return res.status(404).json({ error: "Hindi nahanap ang credential." });
    }
    const current = rows[0];

    // I-check ang PIN conflict lang kung may binagong credential_id at
    // fingerprint ang device_type.
    if (current.device_type === "fingerprint" && credential_id && credential_id !== current.credential_id) {
      const conflictId = await checkPinConflict(credential_id, id);
      if (conflictId) {
        return res.status(409).json({ error: `Ginagamit na ang Device PIN "${credential_id}" ng ibang empleyado.` });
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
        face_descriptor: face_descriptor ? JSON.stringify(face_descriptor) : current.face_descriptor,
        credential_id: credential_id ?? current.credential_id,
        is_active: is_active ?? current.is_active,
      }
    );

    if (current.device_type === "face_id" && photo_data) {
      await q(`UPDATE employees SET avatar_url = :photo_data WHERE id = :employee_id`, {
        photo_data,
        employee_id: current.employee_id,
      });
    }

    await q(
      "INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'update','biometric_credentials',:rid,:ip)",
      { uid: req.user.id, rid: id, ip: req.ip }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("PUT /biometric-credentials/:id error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to update credential" });
  }
});

// -----------------------------------------------------------------------
// DELETE /biometric-credentials/:id — DEACTIVATE (soft delete)
// Hindi natin tinatanggal nang tuluyan ang row (para may audit trail pa
// rin), sa halip ay ise-set na lang na is_active = FALSE. Pagkatapos
// nito, pwede nang mag-enroll ulit ang parehong employee sa parehong
// device_type dahil wala nang "active" credential na naka-block.
//
// Kung gusto talaga ng HARD delete (permanenteng tanggalin ang row),
// idagdag ang query param na ?hard=true.
// -----------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const hard = req.query.hard === "true";

    const rows = await q("SELECT id FROM biometric_credentials WHERE id = :id", { id });
    if (!rows[0]) {
      return res.status(404).json({ error: "Hindi nahanap ang credential." });
    }

    if (hard) {
      await q("DELETE FROM biometric_credentials WHERE id = :id", { id });
    } else {
      await q("UPDATE biometric_credentials SET is_active = FALSE WHERE id = :id", { id });
    }

    await q(
      "INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,:action,'biometric_credentials',:rid,:ip)",
      { uid: req.user.id, action: hard ? "delete" : "deactivate", rid: id, ip: req.ip }
    );
    res.json({ success: true, hard });
  } catch (err) {
    console.error("DELETE /biometric-credentials/:id error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to delete credential" });
  }
});

export default router;