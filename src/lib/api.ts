// src/lib/api.ts
// Kapalit ng supabase.ts — plain fetch wrapper papunta sa Express backend natin.

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

function getToken(): string | null {
  return localStorage.getItem("wms_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("wms_token", token);
  else localStorage.removeItem("wms_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // ---- Auth ----
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  faceLogin: (face_descriptor: number[]) =>
    request<{ token: string; user: any }>("/auth/face-login", {
      method: "POST",
      body: JSON.stringify({ face_descriptor }),
    }),
  me: () => request<any>("/auth/me"),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),

  // ---- Employees ----
  getEmployees: () => request<any[]>("/employees"),
  getEmployee: (id: string) => request<any>(`/employees/${id}`),
  createEmployee: (data: any) => request<{ id: string }>("/employees", { method: "POST", body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: any) => request<{ ok: true }>(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteEmployee: (id: string) => request<{ ok: true }>(`/employees/${id}`, { method: "DELETE" }),
  // BAGO — Recently Deleted / Recycle Bin para sa employees.
  // Ang deleteEmployee sa itaas ay soft-delete na ngayon sa backend (deleted_at),
  // kaya narito ang mga endpoint para makita at ma-restore ang mga na-delete.
  getDeletedEmployees: () => request<any[]>("/employees/trash"),
  restoreEmployee: (id: string) => request<{ ok: true }>(`/employees/${id}/restore`, { method: "POST" }),
  permanentlyDeleteEmployee: (id: string) => request<{ ok: true }>(`/employees/${id}/permanent`, { method: "DELETE" }),

  // ---- Departments ----
  getDepartments: () => request<any[]>("/departments"),
  createDepartment: (data: any) => request<{ id: string }>("/departments", { method: "POST", body: JSON.stringify(data) }),

  // ---- Attendance ----
  getAttendance: (params?: { date?: string; from?: string; to?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return request<any[]>(`/attendance${qs}`);
  },
  getMonthlyTrend: () => request<any[]>("/attendance/stats/monthly-trend"),
  checkInMe: (method: "biometric" | "manual" | "web" = "biometric") =>
    request<{ ok: true; status: string; check_in: string }>("/attendance/checkin/me", { method: "POST", body: JSON.stringify({ method }) }),
  checkOutMe: (method: "biometric" | "manual" | "web" = "biometric") =>
    request<{ ok: true; check_out: string; work_hours: string; overtime_hours: string }>("/attendance/checkout/me", { method: "POST", body: JSON.stringify({ method }) }),

  // ---- Leave Requests ----
  getLeaveRequests: () => request<any[]>("/leave-requests"),
  createLeaveRequest: (data: any) => request<{ id: string }>("/leave-requests", { method: "POST", body: JSON.stringify(data) }),
  updateLeaveStatus: (id: string, status: "approved" | "rejected") =>
    request<{ ok: true }>(`/leave-requests/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // ---- Biometric ----
  getBiometricCredentials: () => request<any[]>("/biometric-credentials"),
  getEmployeeCount: () => request<{ count: number }>("/biometric-credentials/employee-count"),
  getBiometricStats: () =>
    request<{
      totalEmployees: number;
      enrolledEmployees: number;
      pendingEmployees: number;
      totalCredentials: number;
      enrollmentRate: number;
    }>("/biometric-credentials/stats"),
  getPendingBiometricEnrollment: () => request<any[]>("/biometric-credentials/pending"),
  enrollBiometricDevice: (data: any) => request<{ id: string }>("/biometric-credentials", { method: "POST", body: JSON.stringify(data) }),
  getMyFaceDescriptor: () => request<{ face_descriptor: number[] }>("/biometric-credentials/me/face-descriptor"),
  // BAGO — para sa Edit button sa Biometric Auth page. Tumatawag ng
  // PUT /biometric-credentials/:id sa backend (biometric.js).
  updateBiometricCredential: (id: string, data: any) =>
    request<{ success: true }>(`/biometric-credentials/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  // BAGO — para sa Delete button. Default ay soft-delete (is_active = FALSE,
  // pinapanatili ang audit trail). Ipasa ang `hard: true` kung gusto ng
  // permanenteng pagtanggal ng row (tumutugma sa ?hard=true sa backend).
  deleteBiometricCredential: (id: string, hard = false) =>
    request<{ success: true; hard: boolean }>(`/biometric-credentials/${id}${hard ? "?hard=true" : ""}`, { method: "DELETE" }),

  // ---- Audit Logs ----
  getAuditLogs: () => request<any[]>("/audit-logs"),

  // ---- Dashboard ----
  getDashboardStats: () => request<any>("/dashboard/stats"),
  getRecentActivity: () => request<any[]>("/dashboard/recent-activity"),
  getShiftDistribution: () => request<any[]>("/dashboard/shift-distribution"),

  // ---- Users (User Management page) ----
  getUsers: () => request<any[]>("/users"),
  createUser: (data: any) => request<{ id: string }>("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => request<{ ok: true }>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // ---- Shifts (Shift Scheduling page) ----
  getShiftTypes: () => request<any[]>("/shifts"),
  createShiftType: (data: any) => request<{ id: string }>("/shifts", { method: "POST", body: JSON.stringify(data) }),
  getEmployeeShifts: (from: string, to: string) => request<any[]>(`/shifts/assignments?from=${from}&to=${to}`),
  assignShift: (data: any) => request<{ id: string }>("/shifts/assignments", { method: "POST", body: JSON.stringify(data) }),

  // ---- Employee Portal ("me" — sariling data lang ng naka-login na empleyado) ----
  getMyProfile: () => request<any>("/employees/me"),
  updateMyProfile: (data: any) => request<{ ok: true }>("/employees/me", { method: "PATCH", body: JSON.stringify(data) }),
  getMyAttendance: (from?: string, to?: string) => {
    const qs = from && to ? `?from=${from}&to=${to}` : "";
    return request<any[]>(`/attendance/me${qs}`);
  },
  getMyLeaveRequests: () => request<any[]>("/leave-requests/me"),
  createMyLeaveRequest: (data: any) => request<{ id: string }>("/leave-requests/me", { method: "POST", body: JSON.stringify(data) }),
  getMySchedule: (from: string, to: string) => request<any[]>(`/shifts/assignments/me?from=${from}&to=${to}`),
  getMyNotifications: () => request<any[]>("/notifications/me"),

  // ---- Notifications ----
  getNotifications: () => request<any[]>("/notifications"),
  getUnreadNotificationCount: () => request<{ count: number }>("/notifications/unread-count"),
  markNotificationRead: (id: string) => request<{ ok: true }>(`/notifications/${id}/read`, { method: "PATCH" }),
  markNotificationsRead: () => request<{ ok: true }>("/notifications/read-all", { method: "PATCH" }),
  deleteNotification: (id: string) => request<{ ok: true }>(`/notifications/${id}`, { method: "DELETE" }),

  // ---- Settings (System Settings page) ----
  getSettings: () => request<any[]>("/settings"),
  updateSettings: (updates: { key: string; value: any }[]) =>
    request<{ ok: true }>("/settings", { method: "PATCH", body: JSON.stringify({ updates }) }),

  // ---- Timesheets ----
  getTimesheets: () => request<any[]>("/timesheets"),
  getMyTimesheets: () => request<any[]>("/timesheets/me"),
  generateTimesheet: (data: { employee_id: string; period_start: string; period_end: string }) =>
    request<{ id: string; total_regular_hours: number; total_overtime_hours: number }>("/timesheets/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  submitTimesheet: (id: string) => request<{ ok: true }>(`/timesheets/${id}/submit`, { method: "POST" }),
  updateTimesheetStatus: (id: string, status: "approved" | "rejected") =>
    request<{ ok: true }>(`/timesheets/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // ---- Reports ----
  getReportsSummary: () => request<{ totalReports: number; ready: number }>("/reports/summary"),
  getAttendanceSummaryReport: (month?: string) =>
    request<{ type: string; month: string; rows: any[] }>(`/reports/attendance-summary${month ? `?month=${month}` : ""}`),
  getHeadcountReport: () => request<{ type: string; rows: any[] }>("/reports/headcount"),
  getLeaveSummaryReport: () => request<{ type: string; rows: any[] }>("/reports/leave-summary"),
  getOvertimeReport: (month?: string) =>
    request<{ type: string; month: string; rows: any[] }>(`/reports/overtime${month ? `?month=${month}` : ""}`),
  getTimesheetReport: () => request<{ type: string; rows: any[] }>("/reports/timesheet"),
  getAuditExportReport: () => request<{ type: string; rows: any[] }>("/reports/audit-export"),
};

// ---- CSV export helper — client-side, walang kailangang backend endpoint ----
export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    alert("Walang data na pwedeng i-export.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const str = String(val).replace(/"/g, '""');
          return /[",\n]/.test(str) ? `"${str}"` : str;
        })
        .join(",")
    ),
  ];
  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}