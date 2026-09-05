import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import authRoutes from "./routes/auth.js";
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
import deviceAttendanceRoutes from "./routes/deviceattendance.js"; // BAGO

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));

// MAHALAGA: i-mount ang ADMS/iClock listener BAGO ang express.json() global
// middleware, dahil may sarili itong express.text() body parser na
// naka-scope lang sa router na ito. Kung mauuna ang global express.json(),
// walang epekto naman dahil hindi ito tumutugma sa content-type na
// ipinapadala ng fingerprint device — pero mas malinaw at mas ligtas kung
// bago natin ilagay ito, iwas future conflicts.
app.use("/iclock", deviceAttendanceRoutes);

app.use(express.json());

app.use("/api/auth", authRoutes);
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

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

process.on("unhandledRejection", (err) => {
  console.error("⚠️  Unhandled rejection (hindi pinatay ang server):", err);
});
process.on("uncaughtException", (err) => {
  console.error("⚠️  Uncaught exception (hindi pinatay ang server):", err);
});

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => console.log(`✅ Workforce API running sa http://localhost:${PORT}/api`));