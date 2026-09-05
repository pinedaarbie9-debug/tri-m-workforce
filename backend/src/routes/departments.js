import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /departments — kasama ang head_count galing sa employees table
router.get("/", async (req, res) => {
  try {
    const rows = await q(`
      SELECT d.*,
        (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.status = 'active') AS head_count
      FROM departments d
      ORDER BY d.name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /departments error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch departments" });
  }
});

// POST /departments
router.post("/", async (req, res) => {
  try {
    const { name, code, manager, color } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: "Kailangan ng name at code." });
    }
    const id = crypto.randomUUID();
    await q(
      `INSERT INTO departments (id, name, code, manager, color) VALUES (:id, :name, :code, :manager, :color)`,
      { id, name, code, manager: manager || null, color: color ?? "#7c3aed" }
    );
    await q(
      "INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'create','departments',:rid,:ip)",
      { uid: req.user.id, rid: id, ip: req.ip }
    );
    res.status(201).json({ id });
  } catch (err) {
    console.error("POST /departments error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to create department" });
  }
});

export default router;