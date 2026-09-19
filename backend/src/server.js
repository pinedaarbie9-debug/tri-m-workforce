// backend/src/server.js
// Last updated: 2026-09-19

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// ============================================================
// 🔒 ENV VALIDATION — Bago mag-import ng routes
// ============================================================
const REQUIRED_ENV = ["JWT_SECRET", "DATABASE_URL"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ Fatal: Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error(
    "❌ Fatal: JWT_SECRET must be at least 32 characters. Generate with: openssl rand -base64 48"
  );
  process.exit(1);
}

console.log("🔧 Starting server.js...");

// ============================================================
// Route imports
// ============================================================
import authRoutes from "./routes/auth.js";
import mfaRoutes from "./routes/mfa.js";
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

console.log("✅ All route files imported.");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============================================================
// 🔒 Trust proxy (kailangan para sa Railway)
// ============================================================
app.set("trust proxy", 1);

// ============================================================
// 🔒 HELMET — Security headers
// ============================================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ============================================================
// 🔒 CORS — Explicit origins, no wildcard in production
// ============================================================
const rawCors = process.env.CORS_ORIGIN ?? "http://localhost:5173";
const allowedOrigins = rawCors
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === "production" && allowedOrigins.includes("*")) {
  console.error("❌ Fatal: Cannot use wildcard CORS in production.");
  process.exit(1);
}

console.log("🌐 Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`⚠️  CORS blocked: ${origin}`);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    // 🔒 Idinagdag ang "X-Requested-With" para sa CSRF protection
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// ============================================================
// 🔒 RATE LIMITERS
// ============================================================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
});

const faceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many face login attempts. Try again later." },
});

app.use("/api", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/face-login", faceLimiter);
app.use("/api/auth/verify-mfa", authLimiter);

// ============================================================
// ADMS/iClock listener — BAGO ang express.json()
// ============================================================
app.use("/iclock", deviceAttendanceRoutes);

// ============================================================
// 🔒 BODY PARSERS
// ============================================================
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ============================================================
// 🔒 CUSTOM JSON ERROR HANDLER
// Hindi nag-le-leak ng parser position sa malformed JSON
// ============================================================
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON in request body." });
  }
  next(err);
});

// ============================================================
// API Routes
// ============================================================
app.use("/api/auth", authRoutes);
app.use("/api/mfa", mfaRoutes);
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
// Serve built frontend (Vite output)
// ============================================================
const frontendPath = path.join(__dirname, "../../dist");

console.log("📁 Serving frontend from dist folder");

app.use(express.static(frontendPath));

// SPA fallback — hindi kasama ang /api at /iclock
app.get(/^(?!\/api|\/iclock).*/, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ============================================================
// 404 handler para sa /api routes
// ============================================================
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// ============================================================
// 🔒 GLOBAL ERROR HANDLER — dapat laging PINAKAHULI
// ============================================================
app.use((err, req, res, next) => {
  console.error("❌ Express error handler:", err);
  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({ error: "Internal server error." });
  }
  return res
    .status(500)
    .json({ error: err.message ?? "Internal server error." });
});

// ============================================================
// 🔒 PROCESS-LEVEL ERROR HANDLERS
// ============================================================
process.on("unhandledRejection", (err) => {
  console.error("⚠️  Unhandled rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught exception — shutting down:", err);
  process.exit(1);
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT ?? 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Workforce API + Frontend running sa http://0.0.0.0:${PORT}`);
});