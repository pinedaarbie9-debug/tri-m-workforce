// backend/migrate-fingerprint-template.js
//
// PAANO GAMITIN:
//   1. I-save ang file na ito sa loob ng "backend" folder mo (kasabay ng package.json).
//   2. Sa terminal, sa loob ng backend folder: node migrate-fingerprint-template.js
//   3. Kapag successful, pwede mo nang burahin ang file na ito.
//
 import { q } from "./db.js"; 

async function migrate() {
  try {
    console.log("🔍 Checking kung meron nang fingerprint_template column...");

    const columns = await q(`SHOW COLUMNS FROM biometric_credentials LIKE 'fingerprint_template'`);

    if (columns.length > 0) {
      console.log("✅ Meron na ang fingerprint_template column. Wala nang gagawin.");
      process.exit(0);
    }

    console.log("➕ Idinadagdag ang fingerprint_template column...");
    await q(`ALTER TABLE biometric_credentials ADD COLUMN fingerprint_template LONGTEXT NULL`);

    console.log("✅ Tagumpay! Naidagdag na ang fingerprint_template column.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.sqlMessage ?? err.message ?? err);
    process.exit(1);
  }
}

migrate();