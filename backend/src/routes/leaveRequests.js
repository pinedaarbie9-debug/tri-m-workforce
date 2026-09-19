// backend/src/routes/leaveRequests.js
import { Router } from "express";
import crypto from "node:crypto";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { safeParseJSON, getZodError } from "../utils/helpers.js";
import { logAudit } from "../utils/auditlog.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import { notifyAdmins, notifyEmployeeOwner } from "../utils/notify.js";
import { ROLE_GROUPS } from "../utils/roles.js";
import {
  createLeaveRequestSchema,
  adminCreateLeaveRequestSchema,
  updateLeaveStatusSchema,
} from "../validators/businessValidator.js";

const router = Router();
router.use(requireAuth);

// ============================================================
// GET /leave-requests/me — sariling leave requests (LAHAT ng roles)
// ============================================================
router.get("/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "No linked employee record." });
    }
    const rows = await q(
      "SELECT * FROM leave_requests WHERE employee_id = :employee_id ORDER BY created_at DESC",
      { employee_id: req.user.employee_id }
    );
    return res.json(rows);
  } catch (err) {
    return safeError(res, err, "Failed to fetch your leave requests.");
  }
});

// ============================================================
// POST /leave-requests/me — employee self-filing (LAHAT ng roles)
// ============================================================
router.post("/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "No linked employee record." });
    }
    const parsed = createLeaveRequestSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { leave_type, start_date, end_date, reason } = parsed.data;

    const start = new Date(start_date);
    const end = new Date(end_date);
    if (end < start) {
      return validationError(res, "End date must be after start date.");
    }
    const days_count = Math.max(
      1,
      Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
    );

    const settingsRows = await q(
      `SELECT \`key\`, value FROM settings WHERE \`key\` IN ('advance_notice_days', 'annual_leave_days', 'sick_leave_days')`
    );
    const settings = {};
    settingsRows.forEach((r) => {
      settings[r.key] = safeParseJSON(r.value);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilStart = Math.round((start - today) / (1000 * 60 * 60 * 24));
    const advanceNoticeDays = settings.advance_notice_days ?? 0;

    if (leave_type !== "emergency" && daysUntilStart < advanceNoticeDays) {
      return validationError(
        res,
        `At least ${advanceNoticeDays} days advance notice is required for this leave type.`
      );
    }

    if (leave_type === "annual" || leave_type === "sick") {
      const entitlementKey =
        leave_type === "annual" ? "annual_leave_days" : "sick_leave_days";
      const entitlement = settings[entitlementKey] ?? 0;

      const currentYear = new Date().getFullYear();
      const usedRows = await q(
        `SELECT COALESCE(SUM(days_count), 0) AS used
         FROM leave_requests
         WHERE employee_id = :employee_id
           AND leave_type = :leave_type
           AND status IN ('pending', 'approved')
           AND YEAR(start_date) = :year`,
        {
          employee_id: req.user.employee_id,
          leave_type,
          year: currentYear,
        }
      );
      const used = Number(usedRows[0]?.used ?? 0);
      const remaining = entitlement - used;

      if (days_count > remaining) {
        return validationError(
          res,
          `Insufficient ${leave_type} leave balance. Remaining: ${remaining}, requested: ${days_count}.`
        );
      }
    }

    const id = crypto.randomUUID();
    await q(
      `INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, days_count, reason, status)
       VALUES (:id, :employee_id, :leave_type, :start_date, :end_date, :days_count, :reason, 'pending')`,
      {
        id,
        employee_id: req.user.employee_id,
        leave_type,
        start_date,
        end_date,
        days_count,
        reason: reason || null,
      }
    );

    await logAudit({
      userId: req.user.id,
      action: "create",
      module: "leave_requests",
      recordId: id,
      newValues: { leave_type, start_date, end_date, days_count },
      ip: req.ip,
    });

    await notifyAdmins({
      type: "leave_request",
      title: "New Leave Request",
      message: `${req.user.full_name} filed a ${leave_type} leave request (${start_date} to ${end_date}).`,
    });

    return res.status(201).json({ id });
  } catch (err) {
    return safeError(res, err, "Failed to submit leave request.");
  }
});

// ============================================================
// GET /leave-requests — MANAGEMENT lang (admin, hr_manager, supervisor)
// ============================================================
router.get(
  "/",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const rows = await q(`
        SELECT
          l.*,
          JSON_OBJECT(
            'id', e.id,
            'full_name', COALESCE(NULLIF(e.full_name, ''), CONCAT(e.first_name, ' ', e.last_name)),
            'employee_code', e.employee_code,
            'avatar_url', e.avatar_url,
            'department', JSON_OBJECT('name', d.name)
          ) AS employee
        FROM leave_requests l
        JOIN employees e ON e.id = l.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        ORDER BY l.created_at DESC
      `);
      return res.json(
        rows.map((r) => ({ ...r, employee: safeParseJSON(r.employee) }))
      );
    } catch (err) {
      return safeError(res, err, "Failed to fetch leave requests.");
    }
  }
);

// ============================================================
// POST /leave-requests — MANAGEMENT lang (filing on behalf)
// ============================================================
router.post(
  "/",
  requireRole(...ROLE_GROUPS.MANAGEMENT),
  async (req, res) => {
    try {
      const parsed = adminCreateLeaveRequestSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, getZodError(parsed));
      const { employee_id, leave_type, start_date, end_date, reason } =
        parsed.data;

      const start = new Date(start_date);
      const end = new Date(end_date);
      if (end < start) {
        return validationError(res, "End date must be after start date.");
      }
      const days_count = Math.max(
        1,
        Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
      );

      const id = crypto.randomUUID();
      await q(
        `INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, days_count, reason, status)
         VALUES (:id, :employee_id, :leave_type, :start_date, :end_date, :days_count, :reason, 'pending')`,
        {
          id,
          employee_id,
          leave_type,
          start_date,
          end_date,
          days_count,
          reason: reason || null,
        }
      );

      await logAudit({
        userId: req.user.id,
        action: "create",
        module: "leave_requests",
        recordId: id,
        newValues: { employee_id, leave_type, start_date, end_date },
        ip: req.ip,
      });

      const empRows = await q(
        "SELECT COALESCE(NULLIF(full_name, ''), CONCAT(first_name, ' ', last_name)) AS name FROM employees WHERE id = :id",
        { id: employee_id }
      );
      const empName = empRows[0]?.name ?? "An employee";

      await notifyAdmins({
        type: "leave_request",
        title: "New Leave Request",
        message: `${empName} has a ${leave_type} leave request (${start_date} to ${end_date}) filed by an admin.`,
      });

      await notifyEmployeeOwner(employee_id, {
        type: "leave_request",
        title: "Leave Request Filed",
        message: `A ${leave_type} leave request (${start_date} to ${end_date}) was filed for you.`,
      });

      return res.status(201).json({ id });
    } catch (err) {
      return safeError(res, err, "Failed to create leave request.");
    }
  }
);

// ============================================================
// PATCH /leave-requests/:id/status — APPROVERS (admin, hr, supervisor)
// ============================================================
router.patch(
  "/:id/status",
  requireRole(...ROLE_GROUPS.APPROVERS),
  async (req, res) => {
    try {
      const parsed = updateLeaveStatusSchema.safeParse(req.body);
      if (!parsed.success) return validationError(res, getZodError(parsed));
      const { status } = parsed.data;

      const rows = await q(
        "SELECT employee_id, leave_type, start_date, end_date FROM leave_requests WHERE id = :id",
        { id: req.params.id }
      );
      if (!rows[0])
        return res.status(404).json({ error: "Leave request not found." });

      await q("UPDATE leave_requests SET status = :status WHERE id = :id", {
        status,
        id: req.params.id,
      });

      await logAudit({
        userId: req.user.id,
        action: "update",
        module: "leave_requests",
        recordId: req.params.id,
        newValues: { status },
        ip: req.ip,
      });

      await notifyEmployeeOwner(rows[0].employee_id, {
        type: status === "approved" ? "leave_approved" : "leave_rejected",
        title:
          status === "approved"
            ? "Leave Request Approved"
            : "Leave Request Rejected",
        message: `Your ${rows[0].leave_type} leave request (${rows[0].start_date} to ${rows[0].end_date}) has been ${status}.`,
      });

      return res.json({ ok: true });
    } catch (err) {
      return safeError(res, err, "Failed to update leave status.");
    }
  }
);

export default router;