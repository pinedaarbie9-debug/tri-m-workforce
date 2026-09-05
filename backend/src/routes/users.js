import { Router } from "express";
import bcrypt from "bcryptjs";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /users — kasama ang department (galing sa naka-link na employee, kung meron)
router.get("/", async (req, res) => {
  try {
    const rows = await q(`
      SELECT
        u.id, u.full_name, u.email, u.role, u.status, u.last_login, u.created_at,
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

// POST /users
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

    await q(
      `INSERT INTO users (id, full_name, email, password_hash, role, employee_id, status)
       VALUES (:id, :full_name, :email, :password_hash, :role, :employee_id, :status)`,
      {
        id,
        full_name,
        email,
        password_hash,
        role: role ?? "employee",
        employee_id: employee_id || null,
        status: status ?? "active",
      }
    );
    await q(
      "INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'create','users',:rid,:ip)",
      { uid: req.user.id, rid: id, ip: req.ip }
    );
    res.status(201).json({ id });
  } catch (err) {
    console.error("POST /users error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to create user" });
  }
});

// PATCH /users/:id — para sa Deactivate / Change Role sa hinaharap
router.patch("/:id", async (req, res) => {
  try {
    const allowed = ["full_name", "role", "status", "employee_id"];
    const updates = Object.keys(req.body).filter((k) => allowed.includes(k));
    if (updates.length === 0) return res.status(400).json({ error: "Walang laman ang update." });

    const setClause = updates.map((k) => `${k} = :${k}`).join(", ");
    await q(`UPDATE users SET ${setClause} WHERE id = :id`, { ...req.body, id: req.params.id });
    await q(
      "INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'update','users',:rid,:ip)",
      { uid: req.user.id, rid: req.params.id, ip: req.ip }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /users/:id error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to update user" });
  }
});

export default router;