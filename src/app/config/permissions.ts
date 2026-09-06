// src/app/config/permissions.ts
//
// SINGLE SOURCE OF TRUTH para sa "sino ang pwedeng makakita ng anong module."
// Ginagamit ito ng DALAWA: Sidebar.tsx (para itago ang menu item) AT App.tsx
// (para talagang harangan ang URL kahit direktang i-type sa address bar —
// hindi lang basta itago sa UI).
//
// Base ito sa "Roles & Permissions" card na nakita natin sa User Management
// page:
//   Admin      -> All modules, User management, Settings, Audit logs,
//                 Reports, Delete records
//   HR Manager -> Employee management, Leave management, Reports,
//                 Analytics, Notifications
//   Supervisor -> Attendance, Shift scheduling, Timesheets,
//                 Leave approval, Team view
//   Employee   -> Portal lang (hiwalay na na-handle sa App.tsx, roles=["employee"])
//
// PAALALA: Ito ay FRONTEND-ONLY na proteksyon (nag-iisip lang sa UI kung
// ipapakita ba o hindi). Hindi ito kapalit ng backend authorization —
// dapat DIN nating i-check ang role sa Express middleware (backend) bago
// payagan ang mga sensitibong operations tulad ng DELETE user o pag-access
// sa Settings, dahil kahit itago natin dito sa frontend, pwede pa ring
// tawagin ng malisyosong user ang API endpoint direkta (hal. gamit ang
// Postman) kung walang backend check. Sabihin mo lang kung gusto mo ring
// idagdag ang backend-side na role check sa mga routes.

export type Role = "admin" | "hr_manager" | "supervisor" | "employee";

// Key = ang "path" prefix na ginagamit sa route (tumutugma sa mga path sa
// App.tsx at Sidebar.tsx, hal. "/employees", "/reports").
export const MODULE_ROLES: Record<string, Role[]> = {
  "/": ["admin", "hr_manager", "supervisor"], // Dashboard — landing page ng lahat ng admin-side roles
  "/employees": ["admin", "hr_manager"],
  "/departments": ["admin", "hr_manager"],
  "/attendance": ["admin", "supervisor"],
  "/biometric": ["admin"],
  "/shifts": ["admin", "supervisor"],
  "/leave": ["admin", "hr_manager", "supervisor"],
  "/timesheets": ["admin", "supervisor"],
  "/analytics": ["admin", "hr_manager"],
  "/reports": ["admin", "hr_manager"],
  "/notifications": ["admin", "hr_manager", "supervisor"],
  "/users": ["admin"],
  "/audit": ["admin"],
  "/settings": ["admin"],
  "/search": ["admin", "hr_manager", "supervisor"], // utility page, bukas sa lahat
};

// Helper — ginagamit ng Sidebar para malaman kung dapat ipakita ang isang
// menu item para sa kasalukuyang naka-login na role.
export function canAccess(path: string, role: string | undefined): boolean {
  if (!role) return false;
  const allowed = MODULE_ROLES[path];
  if (!allowed) return true; // kung walang entry, default open (walang restriction)
  return allowed.includes(role as Role);
}