import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { logAudit } from "../utils/auditlog.js";

const router = Router();
router.use(requireAuth);
router.use(requireRole("admin"));

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
    res.json(rows);
  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch users" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { full_name, email, password, role, employee_id, status } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "Kailangan ng full name, email, at password." });
    }
    if ((role ?? "employee") === "employee" && !employee_id) {
      return res.status(400).json({ error: "Kailangan mag-link ng employee record para sa role na 'Employee'." });
    }
    const existing = await q("SELECT id FROM users WHERE email = :email LIMIT 1", { email });
    if (existing[0]) {
      return res.status(409).json({ error: "May account na gumagamit ng email na ito." });
    }

    const id = crypto.randomUUID();
    const password_hash = await bcrypt.hash(password, 10);
    const finalRole = role ?? "employee";

    await q(
      `INSERT INTO users (id, full_name, email, password_hash, role, employee_id, status)
       VALUES (:id, :full_name, :email, :password_hash, :role, :employee_id, :status)`,
      {
        id,
        full_name,
        email,
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

    res.status(201).json({ id });
  } catch (err) {
    console.error("POST /users error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to create user" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const allowedFields = ["full_name", "email", "role", "status", "employee_id"];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.password) {
      updates.password_hash = await bcrypt.hash(req.body.password, 10);
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Walang laman ang update." });
    }

    if (updates.email) {
      const existing = await q(
        "SELECT id FROM users WHERE email = :email AND id != :id LIMIT 1",
        { email: updates.email, id: req.params.id }
      );
      if (existing[0]) {
        return res.status(409).json({ error: "May ibang account na gumagamit ng email na ito." });
      }
    }

    // FIX: kunin din ang employee_id at status bago i-update, kailangan natin
    // ito para malaman kung kailangan bang i-restore ang naka-link na employee.
    const before = await q(
      "SELECT full_name, role, status, employee_id FROM users WHERE id = :id",
      { id: req.params.id }
    );
    if (!before[0]) return res.status(404).json({ error: "User not found." });

    const setClause = Object.keys(updates).map((k) => `${k} = :${k}`).join(", ");
    await q(`UPDATE users SET ${setClause} WHERE id = :id`, { ...updates, id: req.params.id });

    // FIX: kapag "active" ang bagong status ng user AT may naka-link na employee_id
    // (ang bago kung binago sa parehong request, o ang luma kung hindi ginalaw),
    // i-restore din natin ang linked employee record kung na-soft-delete ito dati.
    // Ito ang gustong behavior: "pag ni-activate ko ang account, babalik din ang
    // employee sa Employees page."
    const finalEmployeeId = updates.employee_id !== undefined ? updates.employee_id : before[0].employee_id;
    const becomingActive = updates.status === "active" && before[0].status !== "active";

    if (becomingActive && finalEmployeeId) {
      const empRows = await q(
        "SELECT id, full_name, deleted_at FROM employees WHERE id = :id",
        { id: finalEmployeeId }
      );
      if (empRows[0] && empRows[0].deleted_at) {
        await q("UPDATE employees SET deleted_at = NULL WHERE id = :id", { id: finalEmployeeId });

        await logAudit({
          userId: req.user.id,
          action: "update",
          module: "employees",
          recordId: finalEmployeeId,
          oldValues: { status: "deleted" },
          newValues: { full_name: empRows[0].full_name, status: "restored (auto via user activation)" },
          ip: req.ip,
        });
      }
    }

    await logAudit({
      userId: req.user.id,
      action: "update",
      module: "users",
      recordId: req.params.id,
      oldValues: { full_name: before[0].full_name, role: before[0].role },
      newValues: {
        full_name: updates.full_name ?? before[0].full_name,
        role: updates.role ?? before[0].role,
        status: updates.status,
      },
      ip: req.ip,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /users/:id error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to update user" });
  }
});

export default router;