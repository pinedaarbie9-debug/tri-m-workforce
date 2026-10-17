import { q } from "./src/db.js";

async function run() {
  try {
    await q("DELETE FROM employees WHERE employee_code = 'E001'");
    console.log("🗑️ Cleaned up existing E001 (if any).");

    await q(
      "INSERT INTO employees (employee_code, first_name, last_name, full_name, email) VALUES (:employee_code, :first_name, :last_name, :full_name, :email)",
      {
        employee_code: 'E001',
        first_name: 'Maria',
        last_name: 'Santos',
        full_name: 'Maria Santos',
        email: 'e001@hr1.local'
      }
    );
    console.log("✅ Employee E001 inserted successfully!");
    
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    process.exit();
  }
}
run();