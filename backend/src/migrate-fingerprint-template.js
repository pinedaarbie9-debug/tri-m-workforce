import { q, pool } from "./src/db.js";

try {
  await q(`ALTER TABLE biometric_credentials ADD COLUMN IF NOT EXISTS fingerprint_template TEXT NULL`);
  console.log("✅ fingerprint_template column ready.");
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}