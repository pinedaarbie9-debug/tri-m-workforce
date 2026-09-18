import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

console.log("🔧 Nag-start ang server.js, papasok na sa imports...");

import authRoutes from "./routes/auth.js";
import mfaRoutes from "./routes/mfa.js"; // ✅ BAGO
import employeesRoutes from "./routes/employees.js";
import departmentsRoutes from "./routes/departments.js";
import attendanceRoutes from "./routes/attendance.js";
import leaveRequestsRoutes from "./routes/leaveRequests.js";
import biometricRoutes from "./routes/biometric.js";
import auditLogsRoutes from "./routes/auditLogs.js";
import dashboardRoutes from "./routes/dashboard.js";
import usersRoutes from "./routes/users.js";
import shiftsRoutes from "./routes/shifts.js";
import notificationsRoutes from "./routes/notifications.js";
import settingsRoutes from "./routes/settings.js";
import timesheetsRoutes from "./routes/timesheets.js";
import reportsRoutes from "./routes/reports.js";
import deviceAttendanceRoutes from "./routes/deviceattendance.js";
import partnerAttendanceRoutes from "./routes/partnerAttendance.js";

console.log("✅ Lahat ng route files matagumpay na na-import.");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));

// MAHALAGA: i-mount ang ADMS/iClock listener BAGO ang express.json() global middleware.
app.use("/iclock", deviceAttendanceRoutes);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/mfa", mfaRoutes); // ✅ BAGO
app.use("/api/employees", employeesRoutes);
app.use("/api/departments", departmentsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave-requests", leaveRequestsRoutes);
app.use("/api/biometric-credentials", biometricRoutes);
app.use("/api/audit-logs", auditLogsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/shifts", shiftsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/timesheets", timesheetsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/partner/attendance", partnerAttendanceRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// ============================================================
// I-serve ang built frontend (Vite output)
// ============================================================
const frontendPath = path.join(__dirname, "../../dist");

app.use(express.static(frontendPath));

// SPA fallback — kahit anong route na hindi /api o /iclock, ibalik ang index.html
app.get(/^(?!\/api|\/iclock).*/, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});
// ============================================================

// Error handler — dapat laging PINAKAHULI
app.use((err, req, res, next) => {
  console.error("❌ Express error handler:", err);
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

process.on("unhandledRejection", (err) => {
  console.error("⚠️  Unhandled rejection (hindi pinatay ang server):", err);
});
process.on("uncaughtException", (err) => {
  console.error("⚠️  Uncaught exception (hindi pinatay ang server):", err);
});

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Workforce API + Frontend running sa http://0.0.0.0:${PORT}`);
});