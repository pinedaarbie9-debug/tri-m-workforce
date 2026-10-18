// backend/migrate-shift-times.js
// Patakbuhin isang beses:  node migrate-shift-times.js
// Idinadagdag ang start_time / end_time sa shifts at nilalagyan ng oras ang mga
// existing shift types na walang oras pa. Ligtas ulit-ulitin (idempotent).
import "dotenv/config";
import { q } from "./src/db.js";

async function main() {
  await q(`ALTER TABLE shifts ADD COLUMN IF NOT EXISTS start_time time NOT NULL DEFAULT '00:00'`);
  await q(`ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_time time NOT NULL DEFAULT '00:00'`);

  // Default na oras ayon sa pangalan; ang mga walang oras pa (start = end) lang ang ginagalaw.
  await q(
    `UPDATE shifts SET start_time = '08:00', end_time = '17:00'
     WHERE name ILIKE '%day%' AND start_time = end_time`
  );
  await q(
    `UPDATE shifts SET start_time = '16:00', end_time = '00:30'
     WHERE name ILIKE '%evening%' AND start_time = end_time`
  );
  await q(
    `UPDATE shifts SET start_time = '22:00', end_time = '06:00'
     WHERE name ILIKE '%night%' AND start_time = end_time`
  );

  const rows = await q(
    `SELECT name, type, LEFT(CAST(start_time AS text), 5) AS start_time,
            LEFT(CAST(end_time AS text), 5) AS end_time FROM shifts ORDER BY name`
  );
  console.table(rows);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});