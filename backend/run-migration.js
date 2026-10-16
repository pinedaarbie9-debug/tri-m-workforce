// backend/run-migration.js
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dbModule from "./src/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Sinusubukan ang iba't ibang paraan ng pag-export ng db.js
const pool = dbModule.pool || dbModule.default?.pool || dbModule.default || dbModule;

const file = path.join(__dirname, "migrations", "001_leave_labor_law.sql");
const sql = fs.readFileSync(file, "utf8");

try {
  await pool.query(sql);
  console.log("✅ Migration applied:", path.basename(file));

  const r = await pool.query(
    "SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'leave_requests_leave_type_check'"
  );
  console.log(r.rows?.[0]?.def);
} catch (e) {
  console.error("❌ Migration failed:", e.message);
} finally {
  await pool.end?.();
  process.exit(0);
}