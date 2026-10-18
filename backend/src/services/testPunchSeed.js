// backend/src/services/testPunchSeed.js
// PANSAMANTALA. Gumagawa (o nagbubura) ng test punches para kay E033 (Karen Ramos) sa Oct 12-16, 2026,
// para ma-test ni HR3 (Jasmine) ang late/undertime scoring.
//
// Paano gamitin:
//   1. Siguraduhing naka-assign na ang Day shift (08:00-17:00) kay E033 sa Oct 12-16 sa Shift Scheduling.
//   2. Sa HostForge, idagdag ang environment variable TEST_PUNCH_SEED = insert  at i-redeploy.
//   3. Hanapin sa Runtime Logs ang "🧪 Test punches". Pagkatapos, TANGGALIN ang variable (para hindi na maulit sa restart).
//   4. Kapag tapos nang mag-verify si Jasmine: TEST_PUNCH_SEED = cleanup, i-redeploy, tingnan ang log, tapos tanggalin ang variable.
//   5. Sa dulo, tanggalin ang import sa server.js at ang file na ito.
//
// Ligtas: hindi ito nag-o-overwrite ng existing na attendance row (nilalaktawan ang petsang may row na),
// at ang cleanup ay bumubura lang ng rows ni E033 na may marker sa notes.
import crypto from "node:crypto";
import { q } from "../db.js";

const EMPLOYEE_CODE = "E033";
const MARKER = "TEST DATA - HR3 scoring test";

const PUNCHES = [
  { date: "2026-10-12", in: "08:00", out: "17:00", status: "present", hours: "9.00" }, // control
  { date: "2026-10-13", in: "08:08", out: "17:00", status: "present", hours: "8.87" }, // loob ng 10-min grace
  { date: "2026-10-14", in: "08:25", out: "17:00", status: "late", hours: "8.58" },    // late 25
  { date: "2026-10-15", in: "08:00", out: "16:30", status: "present", hours: "8.50" }, // undertime 30
  { date: "2026-10-16", in: "08:00", out: null, status: "present", hours: null },      // missing check-out
];

async function run() {
  const mode = process.env.TEST_PUNCH_SEED?.trim().toLowerCase();
  if (!mode) return;
  if (mode !== "insert" && mode !== "cleanup") {
    console.warn('⚠️ TEST_PUNCH_SEED must be "insert" or "cleanup". Nothing changed.');
    return;
  }

  try {
    const emp = await q(`SELECT id FROM employees WHERE employee_code = :code LIMIT 1`, { code: EMPLOYEE_CODE });
    if (!emp.length) {
      console.warn(`⚠️ Test punches: employee ${EMPLOYEE_CODE} not found. Nothing changed.`);
      return;
    }
    const employeeId = emp[0].id;

    if (mode === "cleanup") {
      await q(`DELETE FROM attendance WHERE employee_id = :eid AND notes = :marker`, {
        eid: employeeId,
        marker: MARKER,
      });
      console.log(`🧪 Test punches for ${EMPLOYEE_CODE} removed. Remove TEST_PUNCH_SEED and this code now.`);
      return;
    }

    let inserted = 0;
    const skipped = [];
    const noShift = [];

    for (const p of PUNCHES) {
      const existing = await q(`SELECT id FROM attendance WHERE employee_id = :eid AND date = :d LIMIT 1`, {
        eid: employeeId,
        d: p.date,
      });
      if (existing.length) {
        skipped.push(p.date);
        continue;
      }

      const shift = await q(`SELECT id FROM employee_shifts WHERE employee_id = :eid AND date = :d LIMIT 1`, {
        eid: employeeId,
        d: p.date,
      });
      if (!shift.length) noShift.push(p.date);

      await q(
        `INSERT INTO attendance (id, employee_id, date, check_in, check_out, status, work_hours, overtime_hours, notes)
         VALUES (:id, :eid, :d, :tin, :tout, :status, :hours, 0, :marker)`,
        {
          id: crypto.randomUUID(),
          eid: employeeId,
          d: p.date,
          tin: p.in,
          tout: p.out,
          status: p.status,
          hours: p.hours,
          marker: MARKER,
        }
      );
      inserted += 1;
    }

    console.log(`🧪 Test punches for ${EMPLOYEE_CODE}: ${inserted} inserted, ${skipped.length} skipped (may row na): ${skipped.join(", ") || "none"}.`);
    if (noShift.length) {
      console.warn(`⚠️ Walang assigned shift si ${EMPLOYEE_CODE} sa: ${noShift.join(", ")}. Mali ang resulta ng test hangga't hindi ito na-assign sa Shift Scheduling.`);
    }
    console.log("🧪 Tanggalin na ang TEST_PUNCH_SEED variable.");
  } catch (err) {
    console.warn("⚠️ Test punch seed failed:", err.message);
  }
}

// Maghintay ng ilang segundo para handa na ang database connection pagka-boot.
setTimeout(run, 6000);