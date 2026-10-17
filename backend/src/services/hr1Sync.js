// backend/src/services/hr1Sync.js
import { q } from "../db.js";

// Helper function para i-sanitize ang employment_type
function normalizeEmploymentType(type) {
  if (!type) return "regular";

  const t = String(type).toLowerCase().trim();
  const validTypes = ["regular", "part_time", "contract", "probationary"];

  if (validTypes.includes(t)) return t;

  if (t === "contractual") return "contract";
  if (t === "casual" || t === "seasonal" || t === "intern") return "contract"; // fallback
  if (t === "full_time" || t === "fulltime") return "regular";

  return "regular";
}

const VALID_STATUSES = ["active", "inactive", "suspended", "on_leave", "terminated"];

function normalizeStatus(status) {
  if (VALID_STATUSES.includes(status)) return status;
  if (status === "resigned") return "terminated";
  return "active";
}

export async function syncEmployeesFromHR1() {
  try {
    const baseUrl = process.env.HR1_RECRUITMENT_BASE_URL;
    const apiKey = process.env.HR1_RECRUITMENT_API_KEY;

    if (!baseUrl || !apiKey) {
      throw new Error("HR1_RECRUITMENT_BASE_URL or HR1_RECRUITMENT_API_KEY is not configured in .env");
    }

    console.log("⏳ Fetching employees from HR1...");

    const response = await fetch(`${baseUrl}/employees?status=active&limit=200`, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HR1 API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const employees = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];

    console.log(`📥 Fetched ${employees.length} employees from HR1.`);

    let syncedCount = 0;
    const errors = [];

    for (const emp of employees) {
      // Ito ang "employee_id" na ipinapadala ng HR1 sa leave/attendance payload (hal. E001).
      // Fallback sa employee_no kung wala.
      const code = emp.employee_id ?? emp.employee_no;
      const label = code ?? emp.email ?? "unknown";

      try {
        if (!code) throw new Error("HR1 employee has no employee_id / employee_no.");

        // Hanapin gamit ang employee_id MUNA, tapos employee_no (para hindi mag-duplicate
        // sa mga record na na-sync dati gamit ang employee_no).
        const candidates = [...new Set([emp.employee_id, emp.employee_no].filter(Boolean).map(String))];
        let existingId = null;
        for (const candidate of candidates) {
          const rows = await q("SELECT id FROM employees WHERE employee_code = :employee_code LIMIT 1", {
            employee_code: candidate,
          });
          if (rows.length > 0) {
            existingId = rows[0].id;
            break;
          }
        }

        const safeEmploymentType = normalizeEmploymentType(emp.employment_type);
        const safeStatus = normalizeStatus(emp.status);
        const fullName =
          emp.full_name || [emp.first_name, emp.last_name].filter(Boolean).join(" ") || null;

        if (existingId) {
          await q(
            `UPDATE employees SET
              employee_code = :employee_code,
              first_name = :first_name,
              last_name = :last_name,
              full_name = :full_name,
              email = :email,
              job_title = :job_title,
              employment_type = :employment_type,
              status = :status,
              updated_at = NOW()
            WHERE id = :id`,
            {
              id: existingId,
              employee_code: String(code),
              first_name: emp.first_name,
              last_name: emp.last_name,
              full_name: fullName,
              email: emp.email,
              job_title: emp.job_title || null,
              employment_type: safeEmploymentType,
              status: safeStatus,
            }
          );
        } else {
          await q(
            `INSERT INTO employees (
              employee_code, first_name, last_name, full_name, email,
              job_title, employment_type, status, hire_date
            ) VALUES (
              :employee_code, :first_name, :last_name, :full_name, :email,
              :job_title, :employment_type, :status, :hire_date
            )`,
            {
              employee_code: String(code),
              first_name: emp.first_name,
              last_name: emp.last_name,
              full_name: fullName,
              email: emp.email,
              job_title: emp.job_title || null,
              employment_type: safeEmploymentType,
              status: safeStatus,
              hire_date: emp.hire_date || new Date().toISOString().slice(0, 10),
            }
          );
        }

        syncedCount++;
      } catch (err) {
        console.error(`❌ Failed to sync employee ${label}:`, err.message);
        errors.push({ employee: label, error: err.message });
      }
    }

    console.log(`✅ Synced ${syncedCount} employees. Errors: ${errors.length}`);

    return {
      success: true,
      count: syncedCount,
      errors: errors.length > 0 ? errors : "None",
    };
  } catch (err) {
    console.error("❌ Sync failed:", err.message);
    return { success: false, error: err.message };
  }
}