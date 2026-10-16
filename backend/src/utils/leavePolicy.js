// backend/src/utils/leavePolicy.js
// Isang lugar para sa lahat ng leave policy. Baguhin dito, hindi sa routes.

export const LEAVE_POLICY = {
  // --- Company-granted (regular employees lang) ---
  annual:    { label: "Vacation leave", basis: "Company policy", companyGranted: true, yearlySetting: "annual_leave_days" },
  sick:      { label: "Sick leave", basis: "Company policy", companyGranted: true, yearlySetting: "sick_leave_days", noAdvanceNotice: true },
  emergency: { label: "Emergency leave", basis: "Company policy", companyGranted: true, noAdvanceNotice: true },
  unpaid:    { label: "Unpaid leave", basis: "Company policy", companyGranted: true },

  // --- Batay sa batas ---
  service_incentive: { label: "Service Incentive Leave", basis: "Labor Code, Art. 95", yearlyCap: 5, minMonths: 12 },
  maternity:         { label: "Maternity leave", basis: "RA 11210", maxPerRequest: 105 },
  paternity:         { label: "Paternity leave", basis: "RA 8187", maxPerRequest: 7 },
  solo_parent:       { label: "Solo parent leave", basis: "RA 8972", yearlyCap: 7, minMonths: 12 },
  vawc:              { label: "VAWC leave", basis: "RA 9262", yearlyCap: 10, noAdvanceNotice: true },
  special_women:     { label: "Special leave for women", basis: "RA 9710", maxPerRequest: 60, minMonths: 6 },
};

export const LEAVE_TYPES = Object.keys(LEAVE_POLICY);

export const daysBetween = (s, e) =>
  Math.max(1, Math.round((new Date(e) - new Date(s)) / 86400000) + 1);

export function monthsOfService(hireDate, onDate) {
  if (!hireDate) return 0;
  const h = new Date(hireDate);
  const d = new Date(onDate);
  let m = (d.getUTCFullYear() - h.getUTCFullYear()) * 12 + (d.getUTCMonth() - h.getUTCMonth());
  if (d.getUTCDate() < h.getUTCDate()) m -= 1;
  return m;
}

// Yearly limit ng leave type. null = walang yearly limit.
export function yearlyEntitlement(type, settings = {}) {
  const p = LEAVE_POLICY[type];
  if (!p) return null;
  if (p.yearlySetting) return Number(settings[p.yearlySetting] ?? 0);
  if (p.yearlyCap != null) return p.yearlyCap;
  return null;
}

const prettyType = (t) =>
  String(t ?? "").replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Puwede bang mag-file ng leave type na ito ang empleyado?
export function checkEligibility(emp, leaveType, startDate, { self = false } = {}) {
  const p = LEAVE_POLICY[leaveType];
  if (!p) return { ok: false, message: "Invalid leave type." };

  if (!emp) {
    return { ok: false, notFound: true, message: self ? "Employee record not found." : "Employee not found." };
  }
  if (emp.status !== "active") {
    return {
      ok: false,
      message: self
        ? "Your account is inactive. Please contact HR."
        : "This employee is inactive. Only active employees can file leave requests.",
    };
  }
  if (p.companyGranted && emp.employment_type !== "regular") {
    return {
      ok: false,
      message: `${p.label} is only available to regular employees. ${self ? "Your" : "This employee's"} employment type is "${prettyType(emp.employment_type)}".`,
    };
  }
  if (p.minMonths) {
    const m = monthsOfService(emp.hire_date, startDate);
    if (m < p.minMonths) {
      return {
        ok: false,
        message: `${p.label} requires at least ${p.minMonths} months of service (${p.basis}). Service so far: ${Math.max(m, 0)} months.`,
      };
    }
  }
  return { ok: true };
}