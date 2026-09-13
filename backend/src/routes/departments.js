import { Router } from "express";
import crypto from "node:crypto"; // FIX: nawawala ito dati
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /departments — kasama ang head_count galing sa employees table
// FIX: idinagdag ang "AND e.deleted_at IS NULL" para hindi mabilang ang
// mga soft-deleted employees sa head_count ng bawat department.
router.get("/", async (req, res) => {
  try {
    const rows = await q(`
      SELECT d.*,
        (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.status = 'active' AND e.deleted_at IS NULL) AS head_count
      FROM departments d
      ORDER BY d.name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /departments error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch departments" });
  }
});

// GET /departments/:id
// FIX: parehong "AND e.deleted_at IS NULL" fix dito
router.get("/:id", async (req, res) => {
  try {
    const rows = await q(
      `SELECT d.*,
        (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.status = 'active' AND e.deleted_at IS NULL) AS head_count
       FROM departments d WHERE d.id = :id`,
      { id: req.params.id }
    );
    if (!rows[0]) return res.status(404).json({ error: "Department not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /departments/:id error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch department" });
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

// PATCH /departments/:id
router.patch("/:id", async (req, res) => {
  try {
    const allowed = ["name", "code", "manager", "color"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Walang laman ang update." });
    }

    const existing = await q("SELECT id, name FROM departments WHERE id = :id", { id: req.params.id });
    if (!existing[0]) return res.status(404).json({ error: "Department not found" });

    const setClause = Object.keys(updates).map((k) => `${k} = :${k}`).join(", ");
    await q(`UPDATE departments SET ${setClause} WHERE id = :id`, { ...updates, id: req.params.id });

    await q(
      "INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'update','departments',:rid,:ip)",
      { uid: req.user.id, rid: req.params.id, ip: req.ip }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /departments/:id error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to update department" });
  }
});

// DELETE /departments/:id
router.delete("/:id", async (req, res) => {
  try {
    const existing = await q("SELECT id, name FROM departments WHERE id = :id", { id: req.params.id });
    if (!existing[0]) return res.status(404).json({ error: "Department not found" });

    // Proteksyon: huwag payagang mabura ang department kung may empleyado
    // pa ring naka-assign dito — para hindi mag-orphan ang mga records nila
    // o mabasag ang foreign key constraint sa DB.
    const headcount = await q(
      "SELECT COUNT(*) AS count FROM employees WHERE department_id = :id AND deleted_at IS NULL",
      { id: req.params.id }
    );
    if ((headcount[0]?.count ?? 0) > 0) {
      return res.status(400).json({
        error: `Hindi pwedeng burahin ang department na ito — may ${headcount[0].count} (na) empleyado pa itong naka-assign. I-reassign muna sila sa ibang department.`,
      });
    }

    await q("DELETE FROM departments WHERE id = :id", { id: req.params.id });

    await q(
      "INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'delete','departments',:rid,:ip)",
      { uid: req.user.id, rid: req.params.id, ip: req.ip }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /departments/:id error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to delete department" });
  }
});

export default router;