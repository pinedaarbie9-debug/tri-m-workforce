import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /shifts
router.get("/", async (req, res) => {
  try {
    const rows = await q("SELECT * FROM shifts ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    console.error("GET /shifts error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch shifts" });
  }
});

// POST /shifts
router.post("/", async (req, res) => {
  try {
    const { type, name, color } = req.body;
    if (!type || !name) {
      return res.status(400).json({ error: "Kailangan ng type at name." });
    }
    const id = crypto.randomUUID();
    await q(`INSERT INTO shifts (id, type, name, color) VALUES (:id, :type, :name, :color)`, {
      id,
      type,
      name,
      color: color ?? "#7c3aed",
    });
    await q(
      "INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'create','shifts',:rid,:ip)",
      { uid: req.user.id, rid: id, ip: req.ip }
    );
    res.status(201).json({ id });
  } catch (err) {
    console.error("POST /shifts error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to create shift" });
  }
});

// GET /shifts/assignments/me?from=YYYY-MM-DD&to=YYYY-MM-DD — sariling weekly schedule
router.get("/assignments/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "Walang naka-link na employee record sa account na ito." });
    }
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: "Kailangan ng from at to date." });

    const rows = await q(
      `
      SELECT
        es.id, es.date, es.employee_id, es.shift_id,
        s.name AS shift_name, s.type AS shift_type, s.color AS shift_color
      FROM employee_shifts es
      JOIN shifts s ON s.id = es.shift_id
      WHERE es.employee_id = :employee_id AND es.date BETWEEN :from AND :to
      ORDER BY es.date ASC
      `,
      { employee_id: req.user.employee_id, from, to }
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /shifts/assignments/me error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch schedule" });
  }
});

// GET /shifts/assignments?from=YYYY-MM-DD&to=YYYY-MM-DD — lahat ng empleyado (admin view)
router.get("/assignments", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: "Kailangan ng from at to date." });

    const rows = await q(
      `
      SELECT
        es.id, es.date, es.employee_id, es.shift_id,
        COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
        d.name AS department_name,
        s.name AS shift_name, s.type AS shift_type, s.color AS shift_color
      FROM employee_shifts es
      JOIN employees e ON e.id = es.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      JOIN shifts s ON s.id = es.shift_id
      WHERE es.date BETWEEN :from AND :to
      ORDER BY es.date ASC
    `,
      { from, to }
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /shifts/assignments error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch assignments" });
  }
});

// POST /shifts/assignments
router.post("/assignments", async (req, res) => {
  try {
    const { employee_id, shift_id, date } = req.body;
    if (!employee_id || !shift_id || !date) {
      return res.status(400).json({ error: "Kailangan ng employee_id, shift_id, at date." });
    }
    const id = crypto.randomUUID();
    await q(
      `INSERT INTO employee_shifts (id, employee_id, shift_id, date) VALUES (:id, :employee_id, :shift_id, :date)`,
      { id, employee_id, shift_id, date }
    );
    await q(
      "INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'create','employee_shifts',:rid,:ip)",
      { uid: req.user.id, rid: id, ip: req.ip }
    );
    res.status(201).json({ id });
  } catch (err) {
    console.error("POST /shifts/assignments error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to assign shift" });
  }
});

export default router;