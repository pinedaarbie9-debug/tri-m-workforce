import { q } from "./src/db.js";

async function run() {
  try {
    await q("ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS reference_id VARCHAR(255)");
    console.log("✅ reference_id column added to local DB!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    process.exit();
  }
}
run();