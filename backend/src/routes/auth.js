import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

// Ilalabas ang isang naka-sign na JWT + user object — ginagamit ng parehong
// password login at face login para hindi na natin kailangang ulitin ang logic.
async function issueSession(user, req) {
  await q("UPDATE users SET last_login = NOW() WHERE id = :id", { id: user.id });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name, employee_id: user.employee_id ?? null },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  await q(
    "INSERT INTO audit_logs (user_id, action, module, ip_address) VALUES (:uid, 'login', 'auth', :ip)",
    { uid: user.id, ip: req.ip }
  );

  return {
    token,
    user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, employee_id: user.employee_id ?? null },
  };
}

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Kailangan ng email at password." });
    }

    const rows = await q("SELECT * FROM users WHERE email = :email LIMIT 1", { email });
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Mali ang email o password." });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Mali ang email o password." });

    if (user.status !== "active") {
      return res.status(403).json({ error: "Naka-suspend o inactive ang account na ito." });
    }

    const session = await issueSession(user, req);
    res.json(session);
  } catch (err) {
    console.error("POST /auth/login error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Login failed" });
  }
});

// POST /auth/face-login — passwordless login gamit ang live face descriptor.
// Ikukumpara ito sa LAHAT ng naka-enroll na face_id credentials (hindi lang sa isang empleyado),
// para makilala kung sino talaga ang naka-harap sa camera, kahit anong role pa niya (admin/employee/atbp.)
router.post("/face-login", async (req, res) => {
  try {
    const { face_descriptor } = req.body;
    if (!Array.isArray(face_descriptor) || face_descriptor.length === 0) {
      return res.status(400).json({ error: "Kailangan ng face descriptor." });
    }

    const credentials = await q(
      `SELECT employee_id, face_descriptor FROM biometric_credentials
       WHERE device_type = 'face_id' AND is_active = TRUE AND face_descriptor IS NOT NULL`
    );

    const THRESHOLD = 0.6; // mas mababa = mas malapit na tugma; 0.6 ang karaniwang threshold ng face-api.js
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
      return res.status(401).json({ error: "Walang tumugmang mukha sa system. Hindi ka nakilala." });
    }

    const userRows = await q("SELECT * FROM users WHERE employee_id = :employee_id LIMIT 1", { employee_id: bestEmployeeId });
    const user = userRows[0];
    if (!user) {
      return res.status(404).json({ error: "Nakilala ang mukha mo pero walang naka-link na login account. Pakikonekta sa admin." });
    }
    if (user.status !== "active") {
      return res.status(403).json({ error: "Naka-suspend o inactive ang account na ito." });
    }

    const session = await issueSession(user, req);
    res.json(session);
  } catch (err) {
    console.error("POST /auth/face-login error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Face login failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const rows = await q("SELECT id, full_name, email, role, employee_id FROM users WHERE id = :id", { id: req.user.id });
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