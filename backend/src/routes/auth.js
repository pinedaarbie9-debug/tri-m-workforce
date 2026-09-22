// backend/src/routes/auth.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import crypto from "node:crypto";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { safeError, validationError } from "../utils/errorResponse.js";
import {
  loginSchema,
  faceLoginSchema,
  verifyMfaSchema,
} from "../validators/authValidator.js";

const router = Router();

// ============================================================
// GRADUATED LOCKOUT SYSTEM
// ============================================================
const LOCKOUT_TIERS = [
  { threshold: 15, lockoutSeconds: 300 },
  { threshold: 7, lockoutSeconds: 60 },
];

const FIRST_LOCKOUT_THRESHOLD = 7;
const DEFAULT_LOCKOUT_SECONDS = 60;

const JWT_EXPIRES_IN = "1d";
const FACE_THRESHOLD = 0.6;

function getLockoutSeconds(attempts) {
  for (const tier of LOCKOUT_TIERS) {
    if (attempts >= tier.threshold) return tier.lockoutSeconds;
  }
  return DEFAULT_LOCKOUT_SECONDS;
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours > 1 ? "s" : ""}`;
}

function getZodError(parsed) {
  const issues = parsed?.error?.issues ?? parsed?.error?.errors ?? [];
  return issues[0]?.message ?? "Invalid input.";
}

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

async function autoResetLockoutIfExpired(user) {
  if (!user.locked_until) return user;

  const isExpired = new Date(user.locked_until) <= new Date();
  if (isExpired) {
    await q(
      "UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = :id",
      { id: user.id }
    );
    user.failed_login_attempts = 0;
    user.locked_until = null;
  }
  return user;
}

async function issueSession(user, req) {
  const sessionId = crypto.randomBytes(32).toString("hex");

  await q(
    "UPDATE users SET last_login = NOW(), failed_login_attempts = 0, locked_until = NULL, current_session_id = :sessionId WHERE id = :id",
    { id: user.id, sessionId }
  );

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      employee_id: user.employee_id ?? null,
      session_id: sessionId,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  await q(
    "INSERT INTO audit_logs (user_id, action, module, ip_address) VALUES (:uid, 'login', 'auth', :ip)",
    { uid: user.id, ip: req.ip }
  );

  return {
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id ?? null,
    },
  };
}

async function registerFailedAttempt(user) {
  const currentAttempts = user.failed_login_attempts ?? 0;
  const attempts = currentAttempts + 1;
  const lockoutSeconds = getLockoutSeconds(attempts);

  if (attempts >= FIRST_LOCKOUT_THRESHOLD) {
    await q(
      "UPDATE users SET failed_login_attempts = :attempts, locked_until = DATE_ADD(NOW(), INTERVAL :secs SECOND) WHERE id = :id",
      { attempts, secs: lockoutSeconds, id: user.id }
    );
    return { locked: true, attempts, lockoutSeconds };
  }

  await q(
    "UPDATE users SET failed_login_attempts = :attempts WHERE id = :id",
    { attempts, id: user.id }
  );
  return { locked: false, attempts, lockoutSeconds: 0 };
}

function buildMfaRequiredResponse(user) {
  const tempToken = jwt.sign(
    { id: user.id, mfa_pending: true },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );
  return {
    requires_mfa: true,
    temp_token: tempToken,
    message: "MFA verification required.",
  };
}

// ============================================================
// POST /api/auth/login
// ============================================================
router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { email, password } = parsed.data;

    const rows = await q(
      "SELECT * FROM users WHERE email = :email LIMIT 1",
      { email }
    );
    let user = rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    user = await autoResetLockoutIfExpired(user);

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const secsLeft = Math.ceil(
        (new Date(user.locked_until) - new Date()) / 1000
      );
      return res.status(403).json({
        error: `Too many login attempts. Try again in ${formatDuration(
          secsLeft
        )}.`,
        locked_until: user.locked_until,
        seconds_left: secsLeft,
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const result = await registerFailedAttempt(user);

      if (result.locked) {
        return res.status(401).json({
          error: `Too many login attempts. Try again in ${formatDuration(
            result.lockoutSeconds
          )}.`,
          locked_until: new Date(
            Date.now() + result.lockoutSeconds * 1000
          ).toISOString(),
          seconds_left: result.lockoutSeconds,
        });
      }

      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (user.status !== "active") {
      return res
        .status(403)
        .json({ error: "This account is suspended or inactive." });
    }

    if (user.mfa_enabled) {
      return res.json(buildMfaRequiredResponse(user));
    }

    const session = await issueSession(user, req);
    return res.json(session);
  } catch (err) {
    return safeError(res, err, "Login failed.");
  }
});

// ============================================================
// POST /api/auth/face-login
// ============================================================
router.post("/face-login", async (req, res) => {
  try {
    const parsed = faceLoginSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { face_descriptor } = parsed.data;

    const credentials = await q(
      `SELECT employee_id, face_descriptor FROM biometric_credentials
       WHERE device_type = 'face_id' AND is_active = TRUE AND face_descriptor IS NOT NULL`
    );

    let bestEmployeeId = null;
    let bestDistance = Infinity;

    for (const cred of credentials) {
      let stored;
      try {
        stored = JSON.parse(cred.face_descriptor);
      } catch {
        continue;
      }
      if (!Array.isArray(stored) || stored.length !== face_descriptor.length)
        continue;
      const dist = euclideanDistance(stored, face_descriptor);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestEmployeeId = cred.employee_id;
      }
    }

    if (!bestEmployeeId || bestDistance > FACE_THRESHOLD) {
      return res
        .status(401)
        .json({ error: "No matching face found. You are not recognized." });
    }

    const userRows = await q(
      "SELECT * FROM users WHERE employee_id = :employee_id LIMIT 1",
      { employee_id: bestEmployeeId }
    );
    let user = userRows[0];

    if (!user) {
      return res.status(404).json({
        error:
          "Face recognized but no linked login account. Please contact admin.",
      });
    }

    user = await autoResetLockoutIfExpired(user);

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const secsLeft = Math.ceil(
        (new Date(user.locked_until) - new Date()) / 1000
      );
      return res.status(403).json({
        error: `Too many login attempts. Try again in ${formatDuration(
          secsLeft
        )}.`,
        locked_until: user.locked_until,
        seconds_left: secsLeft,
      });
    }

    if (user.status !== "active") {
      return res
        .status(403)
        .json({ error: "This account is suspended or inactive." });
    }

    if (user.mfa_enabled) {
      return res.json(buildMfaRequiredResponse(user));
    }

    const session = await issueSession(user, req);
    return res.json(session);
  } catch (err) {
    return safeError(res, err, "Face login failed.");
  }
});

// ============================================================
// POST /api/auth/verify-mfa
// ============================================================
router.post("/verify-mfa", async (req, res) => {
  try {
    const parsed = verifyMfaSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, getZodError(parsed));
    const { temp_token, token } = parsed.data;

    let decoded;
    try {
      decoded = jwt.verify(temp_token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        error: "Invalid or expired temp token. Please log in again.",
      });
    }

    if (!decoded.mfa_pending) {
      return res.status(401).json({ error: "Invalid temp token." });
    }

    const rows = await q("SELECT * FROM users WHERE id = :id LIMIT 1", {
      id: decoded.id,
    });
    const user = rows[0];

    if (!user || !user.mfa_enabled || !user.mfa_secret) {
      return res
        .status(400)
        .json({ error: "MFA is not enabled for this account." });
    }

    const isValidTotp = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: "base32",
      token: String(token).trim(),
      window: 1,
    });

    let isValidBackup = false;
    if (!isValidTotp && user.mfa_backup_codes) {
      try {
        const codes = JSON.parse(user.mfa_backup_codes);
        const idx = codes.indexOf(String(token).trim().toUpperCase());
        if (idx !== -1) {
          isValidBackup = true;
          codes.splice(idx, 1);
          await q("UPDATE users SET mfa_backup_codes = :codes WHERE id = :id", {
            codes: JSON.stringify(codes),
            id: user.id,
          });
        }
      } catch (parseErr) {
        console.error("Backup code parse error:", parseErr);
      }
    }

    if (!isValidTotp && !isValidBackup) {
      return res.status(401).json({ error: "Invalid verification code." });
    }

    const session = await issueSession(user, req);
    return res.json(session);
  } catch (err) {
    return safeError(res, err, "MFA verification failed.");
  }
});

// ============================================================
// GET /api/auth/me
// ============================================================
router.get("/me", requireAuth, async (req, res) => {
  try {
    return res.json(req.user);
  } catch (err) {
    return safeError(res, err, "Failed to fetch user.");
  }
});

// ============================================================
// POST /api/auth/verify-password
// ============================================================
router.post("/verify-password", requireAuth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== "string" || password.length === 0) {
      return res.status(400).json({ error: "Password is required." });
    }

    const rows = await q(
      "SELECT password_hash FROM users WHERE id = :id LIMIT 1",
      { id: req.user.id }
    );
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      await q(
        "INSERT INTO audit_logs (user_id, action, module, ip_address) VALUES (:uid, 'verify_password_failed', 'auth', :ip)",
        { uid: req.user.id, ip: req.ip }
      );
      return res.status(403).json({ error: "Incorrect password." });
    }

    await q(
      "INSERT INTO audit_logs (user_id, action, module, ip_address) VALUES (:uid, 'verify_password', 'auth', :ip)",
      { uid: req.user.id, ip: req.ip }
    );

    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Failed to verify password.");
  }
});

// ============================================================
// POST /api/auth/verify-file-password
// 🔒 ADMIN + HR LANG ang pwedeng mag-download ng file
// ============================================================
router.post("/verify-file-password", requireAuth, async (req, res) => {
  try {
    // 🔒 ROLE CHECK: Admin at HR Manager lang
    const allowedRoles = ["admin", "hr_manager"];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Only Admins and HR Managers can download exported files.",
      });
    }

    const { password } = req.body;

    if (!password || typeof password !== "string" || password.length === 0) {
      return res.status(400).json({ error: "Password is required." });
    }

    // 🔒 Kunin ang hashed file export password mula sa settings
    const rows = await q(
      "SELECT value FROM settings WHERE `key` = 'file_export_password_hash' LIMIT 1"
    );

    if (!rows[0]) {
      return res.status(500).json({
        error:
          "File export password is not configured. Please contact admin.",
      });
    }

    // 🔒 Parse ang JSON string
    let storedHash;
    try {
      storedHash = JSON.parse(rows[0].value);
    } catch {
      storedHash = rows[0].value;
    }

    if (!storedHash || typeof storedHash !== "string") {
      return res.status(500).json({
        error: "Invalid password storage format. Please contact admin.",
      });
    }

    // 🔒 Compare gamit ang bcrypt
    const isValid = await bcrypt.compare(password, storedHash);

    if (!isValid) {
      await q(
        "INSERT INTO audit_logs (user_id, action, module, ip_address) VALUES (:uid, 'verify_password_failed', 'auth', :ip)",
        { uid: req.user.id, ip: req.ip }
      );
      return res.status(403).json({ error: "Incorrect file password." });
    }

    await q(
      "INSERT INTO audit_logs (user_id, action, module, ip_address) VALUES (:uid, 'verify_password', 'auth', :ip)",
      { uid: req.user.id, ip: req.ip }
    );

    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Failed to verify file password.");
  }
});

// ============================================================
// POST /api/auth/logout
// ============================================================
router.post("/logout", requireAuth, async (req, res) => {
  try {
    await q("UPDATE users SET current_session_id = NULL WHERE id = :id", {
      id: req.user.id,
    });

    await q(
      "INSERT INTO audit_logs (user_id, action, module, ip_address) VALUES (:uid, 'logout', 'auth', :ip)",
      { uid: req.user.id, ip: req.ip }
    );
    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Logout failed.");
  }
});

export default router;