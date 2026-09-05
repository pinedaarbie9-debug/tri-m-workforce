import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const SELECT_EMPLOYEE = `
  SELECT
    e.id, e.employee_code, e.first_name, e.last_name,
    COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)) AS full_name,
    e.email, e.phone, e.job_title, e.department_id, e.employment_type, e.status, e.hire_date, e.avatar_url, e.created_at,
    JSON_OBJECT('id', d.id, 'name', d.name, 'code', d.code) AS department
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
`;

// ============================================================
// "/me" ROUTES — DAPAT NASA ITAAS BAGO ANG "/:id"!
// ============================================================

// GET /employees/me — sariling profile ng naka-login na empleyado
router.get("/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "Walang naka-link na employee record sa account na ito." });
    }
    const rows = await q(`${SELECT_EMPLOYEE} WHERE e.id = :id`, { id: req.user.employee_id });
    if (!rows[0]) return res.status(404).json({ error: "Employee not found" });
    res.json({ ...rows[0], department: rows[0].department ? JSON.parse(rows[0].department) : null });
  } catch (err) {
    console.error("GET /employees/me error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch profile" });
  }
});

// PATCH /employees/me — i-update ang sariling contact info (phone/email lang)
router.patch("/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "Walang naka-link na employee record sa account na ito." });
    }
    const allowed = ["phone", "email"];
    const updates = Object.keys(req.body).filter((k) => allowed.includes(k));
    if (updates.length === 0) return res.status(400).json({ error: "Walang laman ang update." });

    const setClause = updates.map((k) => `${k} = :${k}`).join(", ");
    await q(`UPDATE employees SET ${setClause} WHERE id = :id`, { ...req.body, id: req.user.employee_id });
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /employees/me error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to update profile" });
  }
});

// ============================================================
// Admin/management routes (nasa ibaba na ng /me routes)
// ============================================================

// GET /employees
router.get("/", async (req, res) => {
  try {
    const rows = await q(`${SELECT_EMPLOYEE} ORDER BY e.created_at DESC`);
    const parsed = rows.map((r) => ({ ...r, department: r.department ? JSON.parse(r.department) : null }));
    res.json(parsed);
  } catch (err) {
    console.error("GET /employees error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch employees" });
  }
});

// GET /employees/:id
router.get("/:id", async (req, res) => {
  try {
    const rows = await q(`${SELECT_EMPLOYEE} WHERE e.id = :id`, { id: req.params.id });
    if (!rows[0]) return res.status(404).json({ error: "Employee not found" });
    res.json({ ...rows[0], department: rows[0].department ? JSON.parse(rows[0].department) : null });
  } catch (err) {
    console.error("GET /employees/:id error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch employee" });
  }
});

// POST /employees — awtomatikong bubuo ng employee_code base sa "employee_id_prefix" setting
router.post("/", async (req, res) => {
  try {
    const { first_name, last_name, email, phone, job_title, department_id, employment_type, status, hire_date } = req.body;

    const prefixRows = await q(`SELECT value FROM settings WHERE \`key\` = 'employee_id_prefix'`);
    const prefix = prefixRows[0] ? JSON.parse(prefixRows[0].value) : "EMP-";

    const countRows = await q(`SELECT COUNT(*) AS count FROM employees WHERE employee_code LIKE :pattern`, {
      pattern: `${prefix}%`,
    });
    const nextNumber = (countRows[0]?.count ?? 0) + 1;
    const employee_code = `${prefix}${String(nextNumber).padStart(3, "0")}`;

    const id = crypto.randomUUID();
    await q(
      `INSERT INTO employees (id, employee_code, first_name, last_name, email, phone, job_title, department_id, employment_type, status, hire_date)
       VALUES (:id, :employee_code, :first_name, :last_name, :email, :phone, :job_title, :department_id, :employment_type, :status, :hire_date)`,
      { id, employee_code, first_name, last_name, email, phone: phone ?? null, job_title: job_title ?? null, department_id: department_id || null, employment_type: employment_type ?? "full_time", status: status ?? "active", hire_date: hire_date || null }
    );
    await q("INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'create','employees',:rid,:ip)", { uid: req.user.id, rid: id, ip: req.ip });
    res.status(201).json({ id, employee_code });
  } catch (err) {
    console.error("POST /employees error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to create employee" });
  }
});

// PATCH /employees/:id
router.patch("/:id", async (req, res) => {
  try {
    const allowed = ["first_name", "last_name", "email", "phone", "job_title", "department_id", "employment_type", "status", "hire_date"];
    const updates = Object.keys(req.body).filter((k) => allowed.includes(k));
    if (updates.length === 0) return res.status(400).json({ error: "Walang laman ang update." });

    const setClause = updates.map((k) => `${k} = :${k}`).join(", ");
    await q(`UPDATE employees SET ${setClause} WHERE id = :id`, { ...req.body, id: req.params.id });
    await q("INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'update','employees',:rid,:ip)", { uid: req.user.id, rid: req.params.id, ip: req.ip });
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /employees/:id error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to update employee" });
  }
});

// DELETE /employees/:id
router.delete("/:id", async (req, res) => {
  try {
    await q("DELETE FROM employees WHERE id = :id", { id: req.params.id });
    await q("INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'delete','employees',:rid,:ip)", { uid: req.user.id, rid: req.params.id, ip: req.ip });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /employees/:id error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to delete employee" });
  }
});

export default router;