import { Router } from "express";
import { q } from "../db.js";

const router = Router();

// Simpleng API key check — para sa ibang system (hal. HR1/ESS ni Kenneth) na tumatawag dito
// Hindi ito requireAuth dahil hindi naka-login sa system natin ang tumatawag, kundi ibang backend.
function requireApiKey(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!key || key !== process.env.PARTNER_API_KEY) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }
  next();
}

router.use(requireApiKey);

// GET /api/partner/attendance/:employee_id?from=&to=
router.get("/:employee_id", async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { from, to } = req.query;

    let sql = "SELECT date, check_in, check_out, work_hours, overtime_hours, status FROM attendance WHERE employee_id = :employee_id";
    const params = { employee_id };

    if (from && to) {
      sql += " AND date BETWEEN :from AND :to";
      params.from = from;
      params.to = to;
    }
    sql += " ORDER BY date DESC";

    const rows = await q(sql, params);
    res.json({ ok: true, employee_id, records: rows });
  } catch (err) {
    console.error("GET /api/partner/attendance/:employee_id error:", err);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

export default router;