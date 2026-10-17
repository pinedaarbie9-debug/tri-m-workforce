import { q } from "./src/db.js";
async function run() {
  const rows = await q("SELECT leave_type, status, reason, reference_id FROM leave_requests ORDER BY created_at DESC LIMIT 3");
  console.log(rows);
  process.exit();
}
run();