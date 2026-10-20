// backend/scripts/cleanup-test-attendance.js
// Binubura ang TEST attendance rows na bago ang Oct 18 (notes: "TEST DATA ...").
// Default ay DRY-RUN (listahan lang). Para mag-delete talaga: node scripts/cleanup-test-attendance.js --apply
// Run mula sa backend folder, na nakaset ang DB env vars gaya ng ginagamit ng app.
import { q } from "../src/db.js";

const CUTOFF = "2026-10-18";
const apply = process.argv.includes("--apply");

try {
  // 1) Lahat ng row bago ang cutoff, per employee (para makita rin ang hindi TEST DATA)
  const overview = await q(
    `SELECT e.employee_code,
            COUNT(*) AS total_rows,
            COUNT(*) FILTER (WHERE a.notes ILIKE 'TEST DATA%') AS test_rows,
            MIN(a.date) AS first_day, MAX(a.date) AS last_day
     FROM attendance a
     JOIN employees e ON e.id = a.employee_id
     WHERE a.date < :cutoff
     GROUP BY e.employee_code
     ORDER BY e.employee_code`,
    { cutoff: CUTOFF }
  );
  console.log(`Rows before ${CUTOFF}, per employee:`);
  console.table(overview);

  // 2) Ang mabubura lang: TEST DATA at bago ang cutoff
  const targets = await q(
    `SELECT a.id, e.employee_code, a.date, a.check_in, a.check_out, a.notes
     FROM attendance a
     JOIN employees e ON e.id = a.employee_id
     WHERE a.date < :cutoff AND a.notes ILIKE 'TEST DATA%'
     ORDER BY e.employee_code, a.date`,
    { cutoff: CUTOFF }
  );
  console.log(`\nTEST DATA rows na buburahin (${targets.length}):`);
  console.table(targets);

  const nonTest = overview.reduce((n, r) => n + (Number(r.total_rows) - Number(r.test_rows)), 0);
  if (nonTest > 0) {
    console.log(`\nPANSIN: may ${nonTest} row bago ang ${CUTOFF} na HINDI TEST DATA. Hindi ito ginagalaw ng script. Suriin ito nang manu-mano.`);
  }

  if (!apply) {
    console.log("\nDRY-RUN lang. Walang binura. Idagdag ang --apply para mag-delete.");
  } else if (targets.length === 0) {
    console.log("\nWalang buburahin.");
  } else {
    const deleted = await q(
      `DELETE FROM attendance
       WHERE date < :cutoff AND notes ILIKE 'TEST DATA%'
       RETURNING id`,
      { cutoff: CUTOFF }
    );
    console.log(`\nNabura: ${Array.isArray(deleted) ? deleted.length : "ok"} row.`);
  }
} catch (err) {
  console.error("Failed:", err);
  process.exitCode = 1;
}
process.exit();