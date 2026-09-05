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

// Employee Portal pages
import { MyDashboardPage } from "./pages/portal/MyDashboard";
import { MyAttendancePage } from "./pages/portal/MyAttendance";
import { MyLeavePage } from "./pages/portal/MyLeave";
import { MySchedulePage } from "./pages/portal/MySchedule";
import { MyProfilePage } from "./pages/portal/MyProfile";
import { MyNotificationsPage } from "./pages/portal/MyNotifications";

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

                {/* Admin / Management area — hindi puwedeng pasukin ng role na "employee" */}
                <Route
                  element={
                    <ProtectedRoute roles={ADMIN_ROLES}>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="employees" element={<EmployeesPage />} />
                  <Route path="departments" element={<DepartmentsPage />} />
                  <Route path="attendance" element={<AttendancePage />} />
                  <Route path="biometric" element={<BiometricPage />} />
                  <Route path="shifts" element={<ShiftSchedulingPage />} />
                  <Route path="leave" element={<LeaveManagementPage />} />
                  <Route path="timesheets" element={<TimesheetsPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="users" element={<UserManagementPage />} />
                  <Route path="audit" element={<AuditLogsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="search" element={<SearchResultsPage />} />
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