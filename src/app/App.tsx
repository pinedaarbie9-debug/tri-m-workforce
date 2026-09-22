import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NotificationsProvider } from "./components/layout/NotificationsContext";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { Layout } from "./components/layout/Layout";
import { EmployeeLayout } from "./components/layout/EmployeeLayout";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { EmployeesPage } from "./pages/Employees";
import { DepartmentsPage } from "./pages/Departments";
import { AttendancePage } from "./pages/Attendance";
import { BiometricPage } from "./pages/Biometric";
import { ShiftSchedulingPage } from "./pages/ShiftScheduling";
import { LeaveManagementPage } from "./pages/LeaveManagement";
import { TimesheetsPage } from "./pages/Timesheets";
import { AnalyticsPage } from "./pages/Analytics";
import { ReportsPage } from "./pages/Reports";
import { NotificationsPage } from "./pages/Notifications";
import { UserManagementPage } from "./pages/UserManagement";
import { AuditLogsPage } from "./pages/AuditLogs";
import { SettingsPage } from "./pages/Settings";
import { SearchResultsPage } from "./pages/SearchResults";
import { RecentlyDeletedEmployeesPage } from "./pages/RecentlyDeletedEmployees";

// Employee Portal pages
import { MyDashboardPage } from "./pages/portal/MyDashboard";
import { MyAttendancePage } from "./pages/portal/MyAttendance";
import { MyLeavePage } from "./pages/portal/MyLeave";
import { MySchedulePage } from "./pages/portal/MySchedule";
import { MyProfilePage } from "./pages/portal/MyProfile";
import { MyNotificationsPage } from "./pages/portal/MyNotifications";

import { MODULE_ROLES } from "./config/permissions";
import { attachActivityListeners, setToken } from "../lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const ADMIN_ROLES = ["admin", "hr_manager", "supervisor"];

// ============================================================
// 🔒 SESSION TIMEOUT WRAPPER — 3 minutes idle
// ============================================================
function SessionTimeoutWrapper({ children }: { children: React.ReactNode }) {
  const auth = useAuth() as any;
  const user = auth?.user ?? auth?.currentUser ?? null;
  const hasAttachedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      hasAttachedRef.current = false;
      return;
    }
    if (hasAttachedRef.current) return;
    hasAttachedRef.current = true;

    // 🔒 Auto-logout kapag 3 minutes idle
    attachActivityListeners(() => {
      console.warn("⏰ Session expired — auto-logout after 3 minutes idle");
      setToken(null);
      sessionStorage.clear();
      const doLogout =
        auth?.logout ?? auth?.signOut ?? auth?.logOut ?? auth?.clearSession;
      if (typeof doLogout === "function") {
        try {
          doLogout();
        } catch (e) {
          console.warn("Logout function failed:", e);
        }
      }
      window.location.href = "/login?expired=1";
    });
  }, [user]);

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <NotificationsProvider>
              <SessionTimeoutWrapper>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />

                  <Route
                    element={
                      <ProtectedRoute roles={ADMIN_ROLES}>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route
                      index
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/"]}>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="employees"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/employees"]}>
                          <EmployeesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="employees/trash"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/employees"]}>
                          <RecentlyDeletedEmployeesPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="departments"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/departments"]}>
                          <DepartmentsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="attendance"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/attendance"]}>
                          <AttendancePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="biometric"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/biometric"]}>
                          <BiometricPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="shifts"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/shifts"]}>
                          <ShiftSchedulingPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="leave"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/leave"]}>
                          <LeaveManagementPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="timesheets"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/timesheets"]}>
                          <TimesheetsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="analytics"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/analytics"]}>
                          <AnalyticsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="reports"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/reports"]}>
                          <ReportsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="notifications"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/notifications"]}>
                          <NotificationsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="users"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/users"]}>
                          <UserManagementPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="audit"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/audit"]}>
                          <AuditLogsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="settings"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/settings"]}>
                          <SettingsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="search"
                      element={
                        <ProtectedRoute roles={MODULE_ROLES["/search"]}>
                          <SearchResultsPage />
                        </ProtectedRoute>
                      }
                    />
                  </Route>

                  <Route
                    path="/portal"
                    element={
                      <ProtectedRoute roles={["employee"]}>
                        <EmployeeLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<MyDashboardPage />} />
                    <Route path="attendance" element={<MyAttendancePage />} />
                    <Route path="leave" element={<MyLeavePage />} />
                    <Route path="schedule" element={<MySchedulePage />} />
                    <Route path="profile" element={<MyProfilePage />} />
                    <Route
                      path="notifications"
                      element={<MyNotificationsPage />}
                    />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </SessionTimeoutWrapper>
              <Toaster />
            </NotificationsProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}