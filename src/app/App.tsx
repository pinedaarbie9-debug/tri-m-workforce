import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
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

// BAGO — single source of truth ng "sino ang pwedeng makakita ng anong module".
// Parehong ginagamit ito ng Sidebar.tsx (para itago ang menu) at dito sa
// App.tsx (para talagang harangan ang URL kahit direktang i-type).
import { MODULE_ROLES } from "./config/permissions";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

// Mga role na dapat pumasok sa admin/management area (lahat maliban sa "employee")
const ADMIN_ROLES = ["admin", "hr_manager", "supervisor"];

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <NotificationsProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                {/* Admin / Management area — hindi puwedeng pasukin ng role na "employee".
                    Ito ang PANGKALAHATANG check lang (naka-login ka ba bilang isa sa
                    admin/hr_manager/supervisor?). Ang bawat SPECIFIC na module sa loob
                    nito ay may hiwalay pang MODULE_ROLES check sa ibaba — kaya kahit
                    naka-login bilang hr_manager (papasok dito), hindi pa rin niya
                    puwedeng buksan ang /users o /settings kung direktang i-type sa URL. */}
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
                  {/* BAGO — Recently Deleted / Recycle Bin. Ginagamit ang parehong
                      MODULE_ROLES["/employees"] permission dahil parte lang ito ng
                      Employees module — kung sino ang makakapag-delete ay dapat
                      makapag-restore rin. */}
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

                {/* Employee Portal — role "employee" lang ang puwede */}
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
                  <Route path="notifications" element={<MyNotificationsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <Toaster />
            </NotificationsProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}