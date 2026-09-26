// src/lib/api.ts
// Secure API wrapper para sa Express backend

// ============================================================
// 🔒 API URL Resolution
// ============================================================
const API_URL = (() => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.PROD) {
    return "/api";
  }
  return "http://localhost:4000/api";
})();

if (!import.meta.env.PROD) {
  console.log("🌐 API_URL:", API_URL);
}

// ============================================================
// 🔒 Session Timeout Configuration — 3 MINUTES
// ============================================================
const TOKEN_KEY = "wms_token";
const SESSION_START_KEY = "wms_session_start";
const LAST_ACTIVITY_KEY = "wms_last_activity";
const SESSION_TIMEOUT_MS = 3 * 60 * 1000;

function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(SESSION_START_KEY, Date.now().toString());
    sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(SESSION_START_KEY);
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
  }
}

export function touchActivity() {
  if (getToken()) {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }
}

export function isSessionExpired(): boolean {
  const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) return false;
  return Date.now() - Number(lastActivity) > SESSION_TIMEOUT_MS;
}

// ============================================================
// 🔒 Attach activity listeners
// ============================================================
let activityListenerAttached = false;
let activityCheckInterval: ReturnType<typeof setInterval> | null = null;

export function attachActivityListeners(onExpired: () => void) {
  if (activityListenerAttached) return;
  activityListenerAttached = true;

  const updateActivity = () => {
    if (getToken()) {
      sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }
  };

  const events = [
    "mousedown",
    "mousemove",
    "keydown",
    "scroll",
    "touchstart",
    "click",
    "wheel",
  ];
  events.forEach((evt) => {
    window.addEventListener(evt, updateActivity, { passive: true });
  });

  activityCheckInterval = setInterval(() => {
    if (isSessionExpired()) {
      activityListenerAttached = false;
      if (activityCheckInterval) {
        clearInterval(activityCheckInterval);
        activityCheckInterval = null;
      }
      onExpired();
    }
  }, 15000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isSessionExpired()) {
      onExpired();
    }
  });

  window.addEventListener("focus", () => {
    if (isSessionExpired()) {
      onExpired();
    }
  });
}

// ============================================================
// 🔒 Custom Error Class
// ============================================================
export class ApiError extends Error {
  status: number;
  secondsLeft?: number;
  lockedUntil?: string;

  constructor(
    message: string,
    status: number,
    secondsLeft?: number,
    lockedUntil?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.secondsLeft = secondsLeft;
    this.lockedUntil = lockedUntil;
  }
}

// ============================================================
// 🔒 Secure Request Wrapper
// ============================================================
const REQUEST_TIMEOUT_MS = 30 * 1000;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (isSessionExpired()) {
    setToken(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login?expired=1";
    }
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  const token = getToken();
  const url = `${API_URL}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (res.status === 401) {
      setToken(null);
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login")
      ) {
        window.location.href = "/login?expired=1";
      }
      const body = await res.json().catch(() => ({}));
      throw new ApiError(
        body.error ?? "Authentication required.",
        401,
        body.seconds_left,
        body.locked_until
      );
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(
        body.error ?? `Request failed: ${res.status}`,
        res.status,
        body.seconds_left,
        body.locked_until
      );
    }

    touchActivity();

    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 408);
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message ?? "Network error.", 0);
  }
}

// ============================================================
// API Endpoints
// ============================================================
export const api = {
  // ---- Auth ----
  login: (email: string, password: string) =>
    request<{
      token: string;
      user: any;
      requires_mfa?: boolean;
      temp_token?: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  faceLogin: (face_descriptor: number[]) =>
    request<{
      token: string;
      user: any;
      requires_mfa?: boolean;
      temp_token?: string;
    }>("/auth/face-login", {
      method: "POST",
      body: JSON.stringify({ face_descriptor }),
    }),
  verifyMfa: (temp_token: string, token: string) =>
    request<{ token: string; user: any }>("/auth/verify-mfa", {
      method: "POST",
      body: JSON.stringify({ temp_token, token }),
    }),
  me: () => request<any>("/auth/me"),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
 verifyPassword: (password: string) =>
    request<{ ok: true }>("/auth/verify-password", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  // 🔒 File export password verification
  verifyFilePassword: (password: string) =>
    request<{ ok: true }>("/auth/verify-file-password", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  // ---- MFA ----
  mfaStatus: () => request<{ mfa_enabled: boolean }>("/mfa/status"),
  mfaSetup: () =>
    request<{ secret: string; qr_code: string; otpauth_url: string }>(
      "/mfa/setup",
      { method: "POST" }
    ),
  mfaVerifySetup: (token: string) =>
    request<{ ok: true; backup_codes: string[]; message: string }>(
      "/mfa/verify-setup",
      { method: "POST", body: JSON.stringify({ token }) }
    ),
  mfaDisable: (token: string) =>
    request<{ ok: true; message: string }>("/mfa/disable", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  // ---- Employees ----
  getEmployees: () => request<any[]>("/employees"),
  getEmployee: (id: string) => request<any>(`/employees/${id}`),
  createEmployee: (data: any) =>
    request<{ id: string }>("/employees", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateEmployee: (id: string, data: any) =>
    request<{ ok: true }>(`/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteEmployee: (id: string) =>
    request<{ ok: true }>(`/employees/${id}`, { method: "DELETE" }),
  getDeletedEmployees: () => request<any[]>("/employees/trash"),
  restoreEmployee: (id: string) =>
    request<{ ok: true }>(`/employees/${id}/restore`, { method: "POST" }),
  permanentlyDeleteEmployee: (id: string) =>
    request<{ ok: true }>(`/employees/${id}/permanent`, { method: "DELETE" }),

  // ---- Departments ----
  getDepartments: () => request<any[]>("/departments"),
  createDepartment: (data: any) =>
    request<{ id: string }>("/departments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateDepartment: (id: string, data: any) =>
    request<{ ok: true }>(`/departments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteDepartment: (id: string) =>
    request<{ ok: true }>(`/departments/${id}`, { method: "DELETE" }),

  // ---- Attendance ----
  getAttendance: (params?: { date?: string; from?: string; to?: string }) => {
    const qs = params
      ? "?" + new URLSearchParams(params as any).toString()
      : "";
    return request<any[]>(`/attendance${qs}`);
  },
  getMonthlyTrend: () => request<any[]>("/attendance/stats/monthly-trend"),
  checkInMe: (method: "biometric" | "manual" | "web" = "biometric") =>
    request<{ ok: true; status: string; check_in: string }>(
      "/attendance/checkin/me",
      { method: "POST", body: JSON.stringify({ method }) }
    ),
  checkOutMe: (method: "biometric" | "manual" | "web" = "biometric") =>
    request<{
      ok: true;
      check_out: string;
      work_hours: string;
      overtime_hours: string;
    }>("/attendance/checkout/me", {
      method: "POST",
      body: JSON.stringify({ method }),
    }),

  // ---- Leave Requests ----
  getLeaveRequests: () => request<any[]>("/leave-requests"),
  createLeaveRequest: (data: any) =>
    request<{ id: string }>("/leave-requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateLeaveStatus: (id: string, status: "approved" | "rejected") =>
    request<{ ok: true }>(`/leave-requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getLeaveAttachment: (id: string) =>
    request<{ data: string; name: string; type: string; size: number }>(
      `/leave-requests/${id}/attachment`
    ),

  // ---- Biometric ----
  getBiometricCredentials: () => request<any[]>("/biometric-credentials"),
  getEmployeeCount: () =>
    request<{ count: number }>("/biometric-credentials/employee-count"),
  getBiometricStats: () =>
    request<{
      totalEmployees: number;
      enrolledEmployees: number;
      pendingEmployees: number;
      totalCredentials: number;
      enrollmentRate: number;
    }>("/biometric-credentials/stats"),
  getPendingBiometricEnrollment: () =>
    request<any[]>("/biometric-credentials/pending"),
  enrollBiometricDevice: (data: any) =>
    request<{ id: string; credential_id?: string }>(
      "/biometric-credentials",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),
  getMyFaceDescriptor: () =>
    request<{ face_descriptor: number[] }>(
      "/biometric-credentials/me/face-descriptor"
    ),
  updateBiometricCredential: (id: string, data: any) =>
    request<{ success: true }>(`/biometric-credentials/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteBiometricCredential: (id: string, hard = false) =>
    request<{ success: true; hard: boolean }>(
      `/biometric-credentials/${id}${hard ? "?hard=true" : ""}`,
      { method: "DELETE" }
    ),
  generateDevicePin: () =>
    request<{ credential_id: string }>("/biometric-credentials/generate-pin"),
  clearAllBiometricCredentials: (hard = false) =>
    request<{ success: true; hard: boolean; cleared: number }>(
      `/biometric-credentials/clear-all?confirm=true${
        hard ? "&hard=true" : ""
      }`,
      { method: "DELETE" }
    ),

  // ---- Audit Logs ----
  getAuditLogs: () => request<any[]>("/audit-logs"),

  // ---- Dashboard ----
  getDashboardStats: () => request<any>("/dashboard/stats"),
  getRecentActivity: () => request<any[]>("/dashboard/recent-activity"),
  getShiftDistribution: () => request<any[]>("/dashboard/shift-distribution"),

  // ---- Users ----
  getUsers: () => request<any[]>("/users"),
  createUser: (data: any) =>
    request<{ id: string }>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateUser: (id: string, data: any) =>
    request<{ ok: true }>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // ---- Shifts ----
  getShiftTypes: () => request<any[]>("/shifts"),
  createShiftType: (data: any) =>
    request<{ id: string }>("/shifts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getEmployeeShifts: (from: string, to: string) =>
    request<any[]>(`/shifts/assignments?from=${from}&to=${to}`),
  assignShift: (data: any) =>
    request<{ id: string }>("/shifts/assignments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ---- Employee Portal ----
  getMyProfile: () => request<any>("/employees/me"),
  updateMyProfile: (data: any) =>
    request<{ ok: true }>("/employees/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  getMyAttendance: (from?: string, to?: string) => {
    const qs = from && to ? `?from=${from}&to=${to}` : "";
    return request<any[]>(`/attendance/me${qs}`);
  },
  getMyLeaveRequests: () => request<any[]>("/leave-requests/me"),
  createMyLeaveRequest: (data: any) =>
    request<{ id: string }>("/leave-requests/me", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getMySchedule: (from: string, to: string) =>
    request<any[]>(`/shifts/assignments/me?from=${from}&to=${to}`),
  getMyNotifications: () => request<any[]>("/notifications/me"),

  // ---- Notifications ----
  getNotifications: () => request<any[]>("/notifications"),
  getUnreadNotificationCount: () =>
    request<{ count: number }>("/notifications/unread-count"),
  markNotificationRead: (id: string) =>
    request<{ ok: true }>(`/notifications/${id}/read`, { method: "PATCH" }),
  markNotificationsRead: () =>
    request<{ ok: true }>("/notifications/read-all", { method: "PATCH" }),
  deleteNotification: (id: string) =>
    request<{ ok: true }>(`/notifications/${id}`, { method: "DELETE" }),

  // ---- Settings ----
  getSettings: () => request<any[]>("/settings"),
  updateSettings: (updates: { key: string; value: any }[]) =>
    request<{ ok: true }>("/settings", {
      method: "PATCH",
      body: JSON.stringify({ updates }),
    }),

  // ---- Timesheets ----
  getTimesheets: () => request<any[]>("/timesheets"),
  getMyTimesheets: () => request<any[]>("/timesheets/me"),
  generateTimesheet: (data: {
    employee_id: string;
    period_start: string;
    period_end: string;
  }) =>
    request<{
      id: string;
      total_regular_hours: number;
      total_overtime_hours: number;
    }>("/timesheets/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  submitTimesheet: (id: string) =>
    request<{ ok: true }>(`/timesheets/${id}/submit`, { method: "POST" }),
  updateTimesheetStatus: (id: string, status: "approved" | "rejected") =>
    request<{ ok: true }>(`/timesheets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // ---- Reports ----
  getReportsSummary: () =>
    request<{ totalReports: number; ready: number }>("/reports/summary"),
  getAttendanceSummaryReport: (month?: string) =>
    request<{ type: string; month: string; rows: any[] }>(
      `/reports/attendance-summary${month ? `?month=${month}` : ""}`
    ),
  getHeadcountReport: () =>
    request<{ type: string; rows: any[] }>("/reports/headcount"),
  getLeaveSummaryReport: () =>
    request<{ type: string; rows: any[] }>("/reports/leave-summary"),
  getOvertimeReport: (month?: string) =>
    request<{ type: string; month: string; rows: any[] }>(
      `/reports/overtime${month ? `?month=${month}` : ""}`
    ),
  getTimesheetReport: () =>
    request<{ type: string; rows: any[] }>("/reports/timesheet"),
  getAuditExportReport: () =>
    request<{ type: string; rows: any[] }>("/reports/audit-export"),
};

// ============================================================
// 🔒 CSV Export Helper
// ============================================================
export function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    alert("No data to export.");
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          let str = String(val).replace(/"/g, '""');
          if (/^[=+\-@]/.test(str)) {
            str = "'" + str;
          }
          return /[",\n]/.test(str) ? `"${str}"` : str;
        })
        .join(",")
    ),
  ];

  const blob = new Blob([csvLines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeFilename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  a.download = safeFilename.endsWith(".csv")
    ? safeFilename
    : `${safeFilename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}