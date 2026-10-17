// backend/src/services/hr1Sync.js
import { q } from "../db.js";

// Helper function para i-sanitize ang employment_type
function normalizeEmploymentType(type) {
  if (!type) return "regular";
  
  const t = type.toLowerCase().trim();
  const validTypes = ['regular', 'part_time', 'contract', 'probationary'];
  
  // Kung valid na agad, ibalik
  if (validTypes.includes(t)) return t;
  
  // Mapping para sa mga hindi tugmang types galing HR1
  if (t === 'contractual') return 'contract';
  if (t === 'casual' || t === 'seasonal' || t === 'intern') return 'contract'; // fallback
  if (t === 'full_time' || t === 'fulltime') return 'regular';
  
  // Default fallback
  return 'regular';
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
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HR1 API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const employees = result.data;

    console.log(`📥 Fetched ${employees.length} employees from HR1.`);

    let syncedCount = 0;
    let errors = [];

    for (const emp of employees) {
      try {
        const existing = await q(
          "SELECT id FROM employees WHERE employee_code = :employee_code",
          { employee_code: emp.employee_no }
        );

        // I-sanitize ang employment type bago i-save
        const safeEmploymentType = normalizeEmploymentType(emp.employment_type);
        // I-sanitize din ang status (kung sakaling may 'resigned' sa HR1 na wala sa DB)
        const safeStatus = ['active', 'inactive', 'suspended', 'on_leave', 'terminated'].includes(emp.status) 
            ? emp.status 
            : (emp.status === 'resigned' ? 'terminated' : 'active');

        if (existing.length > 0) {
          await q(
            `UPDATE employees SET
              first_name = :first_name,
              last_name = :last_name,
              full_name = :full_name,
              email = :email,
              job_title = :job_title,
              employment_type = :employment_type,
              status = :status,
              updated_at = NOW()
            WHERE employee_code = :employee_code`,
            {
              employee_code: emp.employee_no,
              first_name: emp.first_name,
              last_name: emp.last_name,
              full_name: emp.full_name,
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
              employee_code: emp.employee_no,
              first_name: emp.first_name,
              last_name: emp.last_name,
              full_name: emp.full_name,
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
        console.error(`❌ Failed to sync employee ${emp.employee_no}:`, err.message);
        errors.push({ employee_no: emp.employee_no, error: err.message });
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