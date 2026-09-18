// backend/src/routes/mfa.js
import { Router } from "express";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "node:crypto";
import { q } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../utils/auditlog.js";

const router = Router();
router.use(requireAuth);

router.post("/setup", async (req, res) => {
  try {
    const userId = req.user.id;
    const secret = speakeasy.generateSecret({
      name: `Tri-M Workforce (${req.user.email})`,
      issuer: "Tri-M Global",
      length: 32,
    });

    await q(
      "UPDATE users SET mfa_secret = :secret, mfa_enabled = FALSE WHERE id = :id",
      { secret: secret.base32, id: userId }
    );

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qr_code: qrDataUrl,
      otpauth_url: secret.otpauth_url,
    });
  } catch (err) {
    console.error("POST /mfa/setup error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "MFA setup failed" });
  }
});

router.post("/verify-setup", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Verification code is required." });
    }

    const rows = await q("SELECT mfa_secret FROM users WHERE id = :id", { id: req.user.id });
    const user = rows[0];
    if (!user?.mfa_secret) {
      return res.status(400).json({ error: "No MFA setup in progress." });
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: "base32",
      token: String(token).trim(),
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ error: "Invalid verification code." });
    }

    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase()
    );

    await q(
      "UPDATE users SET mfa_enabled = TRUE, mfa_backup_codes = :codes WHERE id = :id",
      { codes: JSON.stringify(backupCodes), id: req.user.id }
    );

    await logAudit({
      userId: req.user.id,
      action: "enable_mfa",
      module: "auth",
      ip: req.ip,
    });

    res.json({ ok: true, backup_codes: backupCodes });
  } catch (err) {
    console.error("POST /mfa/verify-setup error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "MFA verification failed" });
  }
});

router.post("/disable", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Verification code is required." });
    }

    const rows = await q(
      "SELECT mfa_secret, mfa_backup_codes FROM users WHERE id = :id",
      { id: req.user.id }
    );
    const user = rows[0];
    if (!user?.mfa_secret) {
      return res.status(400).json({ error: "MFA is not enabled." });
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
            { codes: JSON.stringify(codes), id: req.user.id }
          );
        }
      } catch {}
    }

    if (!isValidTotp && !isValidBackup) {
      return res.status(400).json({ error: "Invalid code." });
    }

    await q(
      "UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = :id",
      { id: req.user.id }
    );

    await logAudit({
      userId: req.user.id,
      action: "disable_mfa",
      module: "auth",
      ip: req.ip,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("POST /mfa/disable error:", err);
    res.status(500).json({ error: err.sqlMessage ?? err.message ?? "Failed to disable MFA" });
  }
});

router.get("/status", async (req, res) => {
  try {
    const rows = await q("SELECT mfa_enabled FROM users WHERE id = :id", { id: req.user.id });
    res.json({ mfa_enabled: !!rows[0]?.mfa_enabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;