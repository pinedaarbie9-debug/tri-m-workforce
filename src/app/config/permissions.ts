// src/app/config/permissions.ts
//
// SINGLE SOURCE OF TRUTH para sa "sino ang pwedeng makakita ng anong module."
// Ginagamit ito ng DALAWA: Sidebar.tsx (para itago ang menu item) AT App.tsx
// (para talagang harangan ang URL kahit direktang i-type sa address bar).
//
// ROLES:
//   admin       -> All modules, User management, Settings, Audit logs,
//                  Reports, Delete records (level 100)
//   hr_manager  -> Employee management, Leave management, Reports,
//                  Analytics, Notifications (level 80)
//   supervisor  -> Attendance, Shift scheduling, Timesheets,
//                  Leave approval, Team view (level 60)
//   employee    -> Portal lang (self-service, level 20)
//
// PAALALA: Ito ay FRONTEND-ONLY na proteksyon. Ang backend ay may sariling
// role check (requireRole) para sa tunay na security.

export type Role = "admin" | "hr_manager" | "supervisor" | "employee";

// 🔒 Role hierarchy — mas mataas ang level, mas maraming access
export const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 100,
  hr_manager: 80,
  supervisor: 60,
  employee: 20,
};

// 🔒 Role groups para sa madaling pag-assign
export const ROLE_GROUPS = {
  ALL: ["admin", "hr_manager", "supervisor", "employee"] as Role[],
  MANAGEMENT: ["admin", "hr_manager", "supervisor"] as Role[],
  ADMIN_ONLY: ["admin"] as Role[],
  ADMIN_AND_HR: ["admin", "hr_manager"] as Role[],
  APPROVERS: ["admin", "hr_manager", "supervisor"] as Role[],
  REPORTERS: ["admin", "hr_manager", "supervisor"] as Role[],
};

// 🔒 MODULE_ROLES — sino ang pwedeng makakita ng bawat module
// Key = path prefix (tumutugma sa App.tsx at Sidebar.tsx)
export const MODULE_ROLES: Record<string, Role[]> = {
  // ============================================================
  // OVERVIEW — Management lang
  // ============================================================
  "/": ROLE_GROUPS.MANAGEMENT,
  "/dashboard": ROLE_GROUPS.MANAGEMENT,

  // ============================================================
  // WORKFORCE
  // ============================================================
  "/employees": ROLE_GROUPS.ADMIN_AND_HR,
  "/departments": ROLE_GROUPS.ADMIN_AND_HR,
  "/attendance": ["admin", "supervisor"],   // Supervisor may team view
  "/biometric": ROLE_GROUPS.ADMIN_ONLY,     // Sensitive biometric data

  // ============================================================
  // SCHEDULING
  // ============================================================
  "/shifts": ["admin", "supervisor"],       // Supervisor nag-schedule
  "/leave": ROLE_GROUPS.APPROVERS,          // Approvers lang
  "/timesheets": ["admin", "supervisor"],   // Supervisor nag-approve

  // ============================================================
  // INSIGHTS
  // ============================================================
  "/analytics": ROLE_GROUPS.ADMIN_AND_HR,
  "/reports": ROLE_GROUPS.REPORTERS,

  // ============================================================
  // ADMINISTRATION
  // ============================================================
  "/notifications": ROLE_GROUPS.MANAGEMENT,
  "/users": ROLE_GROUPS.ADMIN_ONLY,         // Admin lang pwede mag-CRUD
  "/audit": ROLE_GROUPS.ADMIN_ONLY,         // Sensitive logs
  "/settings": ROLE_GROUPS.ADMIN_ONLY,      // System config

  // ============================================================
  // UTILITY
  // ============================================================
  "/search": ROLE_GROUPS.MANAGEMENT,

  // ============================================================
  // EMPLOYEE PORTAL — lahat ng roles pwedeng pumasok
  // (para sa self-service: check-in, leave requests, payslips, atbp.)
  // ============================================================
  "/portal": ROLE_GROUPS.ALL,
};

// ============================================================
// 🔒 canAccess — ginagamit ng Sidebar at App.tsx
// ============================================================
export function canAccess(path: string, role: string | undefined): boolean {
  if (!role) return false;

  // Exact match
  if (MODULE_ROLES[path]) {
    return MODULE_ROLES[path].includes(role as Role);
  }

  // Prefix match (halimbawa /employees/123)
  const matchedRoute = Object.keys(MODULE_ROLES).find(
    (route) => route !== "/" && path.startsWith(route)
  );
  if (matchedRoute) {
    return MODULE_ROLES[matchedRoute].includes(role as Role);
  }

  // Default: allow kung walang restriction (halimbawa 404, utility pages)
  return true;
}

// ============================================================
// 🔒 getAllowedRoles — para sa debugging
// ============================================================
export function getAllowedRoles(path: string): Role[] {
  return MODULE_ROLES[path] ?? [];
}

// ============================================================
// 🔒 hasMinLevel — hierarchy-based check
// ============================================================
export function hasMinLevel(role: string | undefined, minLevel: number): boolean {
  if (!role) return false;
  return (ROLE_HIERARCHY[role as Role] ?? 0) >= minLevel;
}