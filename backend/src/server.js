// backend/src/server.js

// Last updated: 2026-09-26 — FIX: idinagdag ang fingerprintBridge route (dati'y wala sa mounting list)
// Last updated: 2026-09-26 — FIX: idinagdag ang request timeout safety net (para sa hang/ETIMEDOUT sa unhandled async errors) + startup DB ping

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
import fingerprintBridgeRoutes from "./routes/fingerprintBridge.js"; // FIX: dati wala itong import
import { pingDb } from "./db.js"; // FIX: para ma-verify agad ang DB connection sa startup

console.log("✅ All route files imported.");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

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
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
        fontSrc: [
          "'self'",
          "data:",
          "https://fonts.gstatic.com",
        ],
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
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`⚠️ CORS blocked: ${origin}`);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-bridge-key"],
  })
);

// ============================================================
// 🔒 REQUEST TIMEOUT SAFETY NET — FIX
// ============================================================
// Kung may async route/middleware (hal. requireAuth) na mag-throw ng error
// (gaya ng ETIMEDOUT papunta sa DB) na walang try/catch + next(err), hindi
// ito naka-catch ng Express 4 — nagiging "unhandled rejection" na lang ito
// (makikita sa logs), at WALANG response na ipinapadala sa client, kaya
// nag-hha-hang ang request hanggang mag-timeout na lang sa frontend side.
// Ito ang safety net: kung lumagpas ang isang request nang 15s nang walang
// response, agad na magpapadala ng malinaw na 503 sa client.
function requestTimeout(ms) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`⏱️ Request timeout (${ms}ms): ${req.method} ${req.originalUrl}`);
        res.status(503).json({ error: "Request timed out. Please try again." });
      }
    }, ms);
    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));
    next();
  };
}

app.use(requestTimeout(15000)); // 15 segundo

// ============================================================
// 🔒 RATE LIMITERS
// ============================================================
// FIX: Na-align na ang IP-based limiters papunta sa 1-minute window para
// tugma sa graduated lockout ng auth.js (7 attempts = 1 min, 10+ = 5 min).
// Dating 15-minute window ang authLimiter kaya may naiiwang "extra" na
// lockout time kahit successful na yung susunod na login — hindi kasi
// na-reset ang per-IP counter (memory-based ito, hiwalay sa database).
//
// Ang `max` dito ay sadyang ginawang MAS MATAAS (20) kaysa sa
// FIRST_LOCKOUT_THRESHOLD (7) ng auth.js, para ang per-EMAIL na graduated
// lockout ang laging unang mag-trigger — ang IP limiter na ito ay backstop
// na lang laban sa mas malalaking brute-force (maraming account, iisang IP).

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // FIX: 15 min -> 1 min
  max: 20,             // FIX: 10 -> 20 (mas mataas sa 7-attempt threshold ng auth.js)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 1 minute." },
});

const faceLimiter = rateLimit({
  windowMs: 60 * 1000, // FIX: 15 min -> 1 min
  max: 10,             // FIX: 5 -> 10
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many face login attempts. Try again in 1 minute." },
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
app.use("/api/fingerprint-bridge", fingerprintBridgeRoutes); // FIX: dati wala itong mounting — ito ang dahilan bakit 404 lagi ang /punch

app.get("/api/health", (req, res) => res.json({ ok: true }));

// ============================================================
// Serve built frontend (Vite output)
// ============================================================

const frontendPath = path.join(__dirname, "../../dist");

console.log("📁 Serving frontend from dist folder");

app.use(express.static(frontendPath));

app.get(/^(?!.*\/api|.*\/iclock).*/, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ============================================================
// 404 handler para sa /api routes
// ============================================================

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// ============================================================
// 🔒 GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error("❌ Express error handler:", err);
  if (res.headersSent) return next(err);
  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({ error: "Internal server error." });
  }
  return res.status(500).json({ error: err.message ?? "Internal server error." });
});

// ============================================================
// 🔒 PROCESS-LEVEL ERROR HANDLERS
// ============================================================

process.on("unhandledRejection", (err) => {
  console.error("⚠️ Unhandled rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught exception — shutting down:", err);
  process.exit(1);
});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`✅ Workforce API + Frontend running sa http://0.0.0.0:${PORT}`);

  // FIX: agad na i-verify kung okay ang koneksyon sa database sa startup,
  // para makita mo kaagad sa logs kung may problema, hindi na kailangang
  // maghintay ng unang request bago malaman.
  try {
    await pingDb();
  } catch (err) {
    console.error("🚨 Hindi makaconnect sa database sa startup:", err.message);
  }
});   