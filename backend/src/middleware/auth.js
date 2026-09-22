// backend/src/middleware/auth.js
import jwt from "jsonwebtoken";
import { q } from "../db.js";
import { ROLE_LEVELS } from "../utils/roles.js";

// ============================================================
// 🔒 requireAuth — Verify JWT + DB refresh + session check
// ============================================================
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    const rows = await q(
      "SELECT id, email, role, full_name, employee_id, status, current_session_id FROM users WHERE id = :id LIMIT 1",
      { id: decoded.id }
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: "User no longer exists." });
    }

    if (user.status !== "active") {
      return res.status(403).json({ error: "Account is inactive." });
    }

    // 🔒 SINGLE-DEVICE LOGIN
    if (
      user.current_session_id &&
      decoded.session_id !== user.current_session_id
    ) {
      return res.status(401).json({
        error: "Session expired. You have been logged in from another device.",
      });
    }

    // ⚠️ IDLE TIMEOUT — Inalis na dito kasi frontend na ang may control
    // (May bug ang dating backend check — nag-expire agad)

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      employee_id: user.employee_id ?? null,
    };

    next();
  } catch (err) {
    console.error("❌ requireAuth error:", err);
    return res.status(500).json({ error: "Authentication failed." });
  }
}

// ============================================================
// 🔒 requireRole — Exact role check
// ============================================================
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "You do not have permission to perform this action.",
      });
    }
    next();
  };
}

// ============================================================
// 🔒 requireMinLevel — Hierarchy-based access control
// ============================================================
export function requireMinLevel(minLevel) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const userLevel = ROLE_LEVELS[req.user.role] ?? 0;
    if (userLevel < minLevel) {
      return res.status(403).json({
        error: "You do not have permission to perform this action.",
      });
    }
    next();
  };
}