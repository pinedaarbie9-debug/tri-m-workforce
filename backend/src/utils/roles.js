// backend/src/utils/roles.js
// Centralized role definitions para sa buong backend

export const ROLES = {
  ADMIN: "admin",
  HR_MANAGER: "hr_manager",
  SUPERVISOR: "supervisor",
  EMPLOYEE: "employee",
};

// 🔒 Role hierarchy
export const ROLE_LEVELS = {
  admin: 100,
  hr_manager: 80,
  supervisor: 60,
  employee: 20,
};

// 🔒 Role groups
export const ROLE_GROUPS = {
  ALL: ["admin", "hr_manager", "supervisor", "employee"],
  MANAGEMENT: ["admin", "hr_manager", "supervisor"],
  ADMIN_ONLY: ["admin"],
  ADMIN_AND_HR: ["admin", "hr_manager"],
  APPROVERS: ["admin", "hr_manager", "supervisor"],
  REPORTERS: ["admin", "hr_manager", "supervisor"],
  EMPLOYEE_MANAGERS: ["admin", "hr_manager", "supervisor"],
};

// 🔒 Check kung sapat ang level
export function hasMinLevel(userRole, minLevel) {
  return (ROLE_LEVELS[userRole] ?? 0) >= minLevel;
}