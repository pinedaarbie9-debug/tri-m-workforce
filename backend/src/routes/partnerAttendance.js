// backend/src/routes/partnerAttendance.js
import { Router } from "express";
import { q } from "../db.js";
import { getZodError } from "../utils/helpers.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import { partnerAttendanceQuerySchema } from "../validators/businessValidator.js";

const router = Router();

// ============================================================
// 🔒 API key check
// ============================================================
function requireApiKey(req, res, next) {
  const key = req.headers["x-api-key"];
  const expected = process.env.PARTNER_API_KEY;

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
// Helper: Hanapin ang employee base sa employee_id (flexible)
// ============================================================
async function findEmployeeByPartnerId(partnerId) {
  // 1. Try exact match (e.g., "E001")
  let result = await q(
    "SELECT id, employee_code FROM employees WHERE employee_code = :emp_id",
    { emp_id: String(partnerId) }
  );
  if (result.length > 0) return result[0];

  // 2. Try with "E" prefix (e.g., "195" -> "E195")
  result = await q(
    "SELECT id, employee_code FROM employees WHERE employee_code = :emp_id",
    { emp_id: `E${partnerId}` }
  );
  if (result.length > 0) return result[0];

  // 3. Try with "EMP-" prefix (e.g., "195" -> "EMP-195")
  result = await q(
    "SELECT id, employee_code FROM employees WHERE employee_code = :emp_id",
    { emp_id: `EMP-${partnerId}` }
  );
  if (result.length > 0) return result[0];

  return null;
}

// ============================================================
// POST /api/partner/sync-data
// ============================================================
router.post("/sync-data", async (req, res) => {
  try {
    const { attendance, leaves } = req.body;
    
    console.log("📥 Received data from Partner (HR1):", JSON.stringify({ attendance, leaves }, null, 2));

    let savedAttendance = 0;
    let savedLeaves = 0;
    let errors = [];

    // --- 1. PROCESS ATTENDANCE ---
    if (attendance && attendance.length > 0) {
      for (let att of attendance) {
        try {
          const employee = await findEmployeeByPartnerId(att.employee_id);

          if (!employee) {
            throw new Error(`Employee code ${att.employee_id} not found in local DB.`);
          }

          await q(
            `INSERT INTO attendance (employee_id, date, check_in, check_out, status, work_hours)
             VALUES (:employee_id, :date, :check_in, :check_out, :status, :work_hours)
             ON CONFLICT (employee_id, date) DO UPDATE SET
               check_in = EXCLUDED.check_in,
               check_out = EXCLUDED.check_out,
               status = EXCLUDED.status,
               work_hours = EXCLUDED.work_hours`,
            {
              employee_id: employee.id,
              date: att.date,
              check_in: att.check_in || null,
              check_out: att.check_out || null,
              status: att.status,
              work_hours: att.work_hours || null
            }
          );
          savedAttendance++;
        } catch (err) {
          console.error(`❌ Error saving attendance for ${att.employee_id}:`, err.message);
          errors.push({ type: 'attendance', employee: att.employee_id, error: err.message });
        }
      }
    }

    // --- 2. PROCESS LEAVES ---
    if (leaves && leaves.length > 0) {
      // Hanapin ang admins para i-notify
      const admins = await q(`
        SELECT id FROM users 
        WHERE role IN ('admin', 'hr_manager') 
        AND status = 'active'
      `);

      for (let lv of leaves) {
        try {
          const employee = await findEmployeeByPartnerId(lv.employee_id);

          if (!employee) {
            throw new Error(`Employee code ${lv.employee_id} not found in local DB.`);
          }

          // I-save ang leave
          await q(
            `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days_count, status)
             VALUES (:employee_id, :leave_type, :start_date, :end_date, :days_count, :status)`,
            {
              employee_id: employee.id,
              leave_type: lv.leave_type,
              start_date: lv.start_date,
              end_date: lv.end_date,
              days_count: lv.days_count || 1,
              status: lv.status
            }
          );

          // 🔔 Mag-insert ng notification para sa bawat admin
          for (const admin of admins) {
            await q(
              `INSERT INTO notifications (user_id, type, title, message, action_url)
               VALUES (:user_id, :type, :title, :message, :action_url)`,
              {
                user_id: admin.id,
                type: 'leave_request',
                title: 'New Leave Request from HR1',
                message: `${employee.employee_code} filed a ${lv.leave_type} leave from ${lv.start_date} to ${lv.end_date}.`,
                action_url: '/leave-management'
              }
            );
          }

          savedLeaves++;
        } catch (err) {
          console.error(`❌ Error saving leave for ${lv.employee_id}:`, err.message);
          errors.push({ type: 'leave', employee: lv.employee_id, error: err.message });
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: "Sync process completed.",
      summary: {
        attendance_saved: savedAttendance,
        leaves_saved: savedLeaves,
        errors: errors.length > 0 ? errors : "None"
      }
    });

  } catch (err) {
    console.error("❌ Fatal error during sync:", err);
    return safeError(res, err, "Failed to sync data from partner.");
  }
});

// ============================================================
// GET /api/partner/attendance/:employee_id
// ============================================================
router.get("/attendance/:employee_id", async (req, res) => {
  try {
    const { employee_id } = req.params;

    const parsed = partnerAttendanceQuerySchema.safeParse(req.query);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { from, to } = parsed.data;

    const employee = await findEmployeeByPartnerId(employee_id);
    if (!employee) {
      return res.status(404).json({ error: `Employee ${employee_id} not found.` });
    }

    let sql =
      "SELECT date, check_in, check_out, work_hours, overtime_hours, status FROM attendance WHERE employee_id = :employee_id";
    const params = { employee_id: employee.id };

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