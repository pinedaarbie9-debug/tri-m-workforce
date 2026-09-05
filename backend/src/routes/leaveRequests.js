import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

async function notifyAdmins({ type, title, message }) {
  const admins = await q("SELECT id FROM users WHERE role IN ('admin','hr_manager','supervisor') AND status = 'active'");
  for (const admin of admins) {
    await q(
      "INSERT INTO notifications (id, user_id, type, title, message) VALUES (:id, :user_id, :type, :title, :message)",
      { id: crypto.randomUUID(), user_id: admin.id, type, title, message }
    );
  }
}

async function notifyEmployeeOwner(employee_id, { type, title, message }) {
  const rows = await q("SELECT id FROM users WHERE employee_id = :employee_id LIMIT 1", { employee_id });
  if (!rows[0]) return;
  await q(
    "INSERT INTO notifications (id, user_id, type, title, message) VALUES (:id, :user_id, :type, :title, :message)",
    { id: crypto.randomUUID(), user_id: rows[0].id, type, title, message }
  );
}

// GET /leave-requests/me
router.get("/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "Walang naka-link na employee record sa account na ito." });
    }
    const rows = await q(
      "SELECT * FROM leave_requests WHERE employee_id = :employee_id ORDER BY created_at DESC",
      { employee_id: req.user.employee_id }
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /leave-requests/me error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch your leave requests" });
  }
});

// POST /leave-requests/me — mag-file ng sariling leave request, may validation + notify admins
router.post("/me", async (req, res) => {
  try {
    if (!req.user.employee_id) {
      return res.status(404).json({ error: "Walang naka-link na employee record sa account na ito." });
    }
    const { leave_type, start_date, end_date, reason } = req.body;
    if (!leave_type || !start_date || !end_date) {
      return res.status(400).json({ error: "Kailangan ng leave type at petsa." });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const days_count = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    // ---- Kunin ang leave settings ----
    const settingsRows = await q(
      `SELECT \`key\`, value FROM settings WHERE \`key\` IN ('advance_notice_days', 'annual_leave_days', 'sick_leave_days')`
    );
    const settings = {};
    settingsRows.forEach((r) => { settings[r.key] = JSON.parse(r.value); });

    // ---- 1. Advance notice validation ----
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilStart = Math.round((start - today) / (1000 * 60 * 60 * 24));
    const advanceNoticeDays = settings.advance_notice_days ?? 0;
    if (leave_type !== "emergency" && daysUntilStart < advanceNoticeDays) {
      return res.status(400).json({
        error: `Kailangan ng hindi bababa sa ${advanceNoticeDays} araw na paunang abiso para sa leave type na ito.`,
      });
    }

    // ---- 2. Entitlement validation (annual/sick) ----
    // TANDAAN: i-verify ang exact enum values ng leave_type column — kung iba ang
    // ginagamit mong string dito ("vacation" imbes na "annual", atbp.), palitan sa ibaba.
    if (leave_type === "annual" || leave_type === "sick") {
      const entitlementKey = leave_type === "annual" ? "annual_leave_days" : "sick_leave_days";
      const entitlement = settings[entitlementKey] ?? 0;

      const currentYear = new Date().getFullYear();
      const usedRows = await q(
        `
        SELECT COALESCE(SUM(days_count), 0) AS used
        FROM leave_requests
        WHERE employee_id = :employee_id
          AND leave_type = :leave_type
          AND status IN ('pending', 'approved')
          AND YEAR(start_date) = :year
        `,
        { employee_id: req.user.employee_id, leave_type, year: currentYear }
      );
      const used = Number(usedRows[0]?.used ?? 0);
      const remaining = entitlement - used;

      if (days_count > remaining) {
        return res.status(400).json({
          error: `Hindi sapat ang natitirang ${leave_type} leave mo. Natitira: ${remaining} araw, hiniling: ${days_count} araw.`,
        });
      }
    }

    const id = crypto.randomUUID();
    await q(
      `INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, days_count, reason, status)
       VALUES (:id, :employee_id, :leave_type, :start_date, :end_date, :days_count, :reason, 'pending')`,
      { id, employee_id: req.user.employee_id, leave_type, start_date, end_date, days_count, reason: reason || null }
    );
    await q(
      "INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'create','leave_requests',:rid,:ip)",
      { uid: req.user.id, rid: id, ip: req.ip }
    );

    await notifyAdmins({
      type: "leave_request",
      title: "New Leave Request",
      message: `${req.user.full_name} filed a ${leave_type} leave request (${start_date} to ${end_date}).`,
    });

    res.status(201).json({ id });
  } catch (err) {
    console.error("POST /leave-requests/me error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to submit leave request" });
  }
});

// GET /leave-requests — admin/HR
router.get("/", async (req, res) => {
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
    res.json(rows.map((r) => ({ ...r, employee: JSON.parse(r.employee) })));
  } catch (err) {
    console.error("GET /leave-requests error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch leave requests" });
  }
});

// POST /leave-requests — admin/HR, gumagawa "para sa" kahit sinong empleyado
router.post("/", async (req, res) => {
  try {
    const { employee_id, leave_type, start_date, end_date, reason } = req.body;
    if (!employee_id || !leave_type || !start_date || !end_date) {
      return res.status(400).json({ error: "Kailangan ng employee, leave type, at petsa." });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    const days_count = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    const id = crypto.randomUUID();
    await q(
      `INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, days_count, reason, status)
       VALUES (:id, :employee_id, :leave_type, :start_date, :end_date, :days_count, :reason, 'pending')`,
      { id, employee_id, leave_type, start_date, end_date, days_count, reason: reason || null }
    );
    await q(
      "INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'create','leave_requests',:rid,:ip)",
      { uid: req.user.id, rid: id, ip: req.ip }
    );
    res.status(201).json({ id });
  } catch (err) {
    console.error("POST /leave-requests error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to create leave request" });
  }
});

// PATCH /leave-requests/:id/status — approve/reject + notify ang empleyado
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const rows = await q("SELECT employee_id, leave_type, start_date, end_date FROM leave_requests WHERE id = :id", { id: req.params.id });
    if (!rows[0]) return res.status(404).json({ error: "Leave request not found" });

    await q("UPDATE leave_requests SET status = :status WHERE id = :id", { status, id: req.params.id });
    await q(
      "INSERT INTO audit_logs (user_id, action, module, record_id, ip_address) VALUES (:uid,'update','leave_requests',:rid,:ip)",
      { uid: req.user.id, rid: req.params.id, ip: req.ip }
    );

    await notifyEmployeeOwner(rows[0].employee_id, {
      type: status === "approved" ? "leave_approved" : "leave_rejected",
      title: status === "approved" ? "Leave Request Approved" : "Leave Request Rejected",
      message: `Your ${rows[0].leave_type} leave request (${rows[0].start_date} to ${rows[0].end_date}) has been ${status}.`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /leave-requests/:id/status error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to update leave status" });
  }
});

export default router;