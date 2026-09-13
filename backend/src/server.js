import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
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
import partnerAttendanceRoutes from "./routes/partnerAttendance.js"; // BAGO - para kay Kenneth/HR1

// Kailangan ito dahil ESM module ("type": "module") - walang built-in __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
app.use("/api/partner/attendance", partnerAttendanceRoutes); // BAGO - endpoint para kay Kenneth

app.get("/api/health", (req, res) => res.json({ ok: true }));

// ============================================================
// BAGONG BAHAGI: I-serve ang built frontend (Vite output)
// ============================================================
// Ang "dist" folder ay nasa ROOT ng repo (my-workforce-app/dist),
// habang ang server.js na ito ay nasa my-workforce-app/backend/src/
// kaya kailangan umakyat ng dalawang level (../../) para maabot ito.
const frontendPath = path.join(__dirname, "../../dist");

app.use(express.static(frontendPath));

// SPA fallback — kahit anong route na hindi /api o /iclock, ibalik ang
// index.html para si React Router na ang bahalang mag-handle ng routing
// (kailangan ito para gumana ang direktang pag-refresh sa mga page tulad
// ng /dashboard, /employees, atbp.)
app.get(/^(?!\/api|\/iclock).*/, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});
// ============================================================

// Error handler — dapat laging PINAKAHULI ito sa lahat ng routes/middleware
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