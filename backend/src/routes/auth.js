import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

async function issueSession(user, req) {
  await q(
    "UPDATE users SET last_login = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE id = :id",
    { id: user.id }
  );

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      employee_id: user.employee_id ?? null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
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
  const attempts = (user.failed_login_attempts ?? 0) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await q(
      "UPDATE users SET failed_login_attempts = :attempts, locked_until = DATE_ADD(NOW(), INTERVAL :secs SECOND) WHERE id = :id",
      { attempts, secs: LOCKOUT_SECONDS, id: user.id }
    );
    return true;
  }
  await q(
    "UPDATE users SET failed_login_attempts = :attempts WHERE id = :id",
    { attempts, id: user.id }
  );
  return false;
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

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const rows = await q("SELECT * FROM users WHERE email = :email LIMIT 1", { email });
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Invalid email or password." });

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const secsLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 1000);
      return res.status(403).json({
        error: `Account is locked. Please try again in ${secsLeft} seconds.`,
        locked_until: user.locked_until,
        seconds_left: secsLeft,
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const nowLocked = await registerFailedAttempt(user);
      if (nowLocked) {
        return res.status(401).json({
          error: `Account locked due to ${MAX_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_SECONDS} seconds.`,
          locked_until: new Date(Date.now() + LOCKOUT_SECONDS * 1000).toISOString(),
          seconds_left: LOCKOUT_SECONDS,
        });
      }
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (user.status !== "active") {
      return res.status(403).json({ error: "This account is suspended or inactive." });
    }

    if (user.mfa_enabled) {
      return res.json(buildMfaRequiredResponse(user));
    }

    const session = await issueSession(user, req);
    res.json(session);
  } catch (err) {
    console.error("POST /auth/login error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Login failed" });
  }
});

router.post("/face-login", async (req, res) => {
  try {
    const { face_descriptor } = req.body;
    if (!Array.isArray(face_descriptor) || face_descriptor.length === 0) {
      return res.status(400).json({ error: "Face descriptor is required." });
    }

    const credentials = await q(
      `SELECT employee_id, face_descriptor FROM biometric_credentials
       WHERE device_type = 'face_id' AND is_active = TRUE AND face_descriptor IS NOT NULL`
    );

    const THRESHOLD = 0.6;
    let bestEmployeeId = null;
    let bestDistance = Infinity;

    for (const cred of credentials) {
      let stored;
      try {
        stored = JSON.parse(cred.face_descriptor);
      } catch {
        continue;
      }
      if (!Array.isArray(stored) || stored.length !== face_descriptor.length) continue;
      const dist = euclideanDistance(stored, face_descriptor);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestEmployeeId = cred.employee_id;
      }
    }

    if (!bestEmployeeId || bestDistance > THRESHOLD) {
      return res.status(401).json({ error: "No matching face found. You are not recognized." });
    }

    const userRows = await q(
      "SELECT * FROM users WHERE employee_id = :employee_id LIMIT 1",
      { employee_id: bestEmployeeId }
    );
    const user = userRows[0];
    if (!user) {
      return res.status(404).json({
        error: "Face recognized but no linked login account. Please contact admin.",
      });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const secsLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 1000);
      return res.status(403).json({
        error: `Account is locked. Please try again in ${secsLeft} seconds.`,
        locked_until: user.locked_until,
        seconds_left: secsLeft,
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({ error: "This account is suspended or inactive." });
    }

    if (user.mfa_enabled) {
      return res.json(buildMfaRequiredResponse(user));
    }

    const session = await issueSession(user, req);
    res.json(session);
  } catch (err) {
    console.error("POST /auth/face-login error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Face login failed" });
  }
});

// ✅ MFA verification step (after login)
router.post("/verify-mfa", async (req, res) => {
  try {
    const { temp_token, token } = req.body;
    if (!temp_token || !token) {
      return res.status(400).json({ error: "Temp token and verification code are required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(temp_token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired temp token. Please log in again." });
    }

    if (!decoded.mfa_pending) {
      return res.status(401).json({ error: "Invalid temp token." });
    }

    const rows = await q("SELECT * FROM users WHERE id = :id LIMIT 1", { id: decoded.id });
    const user = rows[0];
    if (!user || !user.mfa_enabled || !user.mfa_secret) {
      return res.status(400).json({ error: "MFA is not enabled for this account." });
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
          await q(
            "UPDATE users SET mfa_backup_codes = :codes WHERE id = :id",
            { codes: JSON.stringify(codes), id: user.id }
          );
        }
      } catch {}
    }

    if (!isValidTotp && !isValidBackup) {
      return res.status(401).json({ error: "Invalid verification code." });
    }

    const session = await issueSession(user, req);
    res.json(session);
  } catch (err) {
    console.error("POST /auth/verify-mfa error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "MFA verification failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const rows = await q(
      "SELECT id, full_name, email, role, employee_id FROM users WHERE id = :id",
      { id: req.user.id }
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /auth/me error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to fetch user" });
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  try {
    await q(
      "INSERT INTO audit_logs (user_id, action, module, ip_address) VALUES (:uid, 'logout', 'auth', :ip)",
      { uid: req.user.id, ip: req.ip }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /auth/logout error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Logout failed" });
  }
});

export default router;