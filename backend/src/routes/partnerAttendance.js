// backend/src/routes/partnerAttendance.js
import { Router } from "express";
import { q } from "../db.js";
import { getZodError } from "../utils/helpers.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import { partnerAttendanceQuerySchema } from "../validators/businessValidator.js";

const router = Router();

// ============================================================
// 🔒 API key check — para sa partner systems (HR1/ESS, atbp.)
// ============================================================
function requireApiKey(req, res, next) {
  const key = req.headers["x-api-key"];
  const expected = process.env.PARTNER_API_KEY;

  // Kung hindi naka-configure, huwag hayaang bumagsak ang lahat
  if (!expected) {
    console.error("❌ PARTNER_API_KEY is not configured in .env");
    return res.status(500).json({ error: "Partner API not configured." });
  }

  if (!key || key !== expected) {
    return res.status(401).json({ error: "Invalid or missing API key." });
  }

  next();
}

router.use(requireApiKey);

// ============================================================
// GET /api/partner/attendance/:employee_id?from=&to=
// ============================================================
router.get("/:employee_id", async (req, res) => {
  try {
    const { employee_id } = req.params;

    // 🔒 Zod validation para sa query params
    const parsed = partnerAttendanceQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { from, to } = parsed.data;

    let sql =
      "SELECT date, check_in, check_out, work_hours, overtime_hours, status FROM attendance WHERE employee_id = :employee_id";
    const params = { employee_id };

    if (from && to) {
      sql += " AND date BETWEEN :from AND :to";
      params.from = from;
      params.to = to;
    }
    sql += " ORDER BY date DESC";

    const rows = await q(sql, params);
    return res.json({ ok: true, employee_id, records: rows });
  } catch (err) {
    return safeError(res, err, "Failed to fetch attendance.");
  }
});

export default router;