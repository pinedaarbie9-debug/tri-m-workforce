// backend/src/services/fileExportPasswordReset.js
// PANSAMANTALA. Isang beses na reset ng File Export Password.
//
// Paano gamitin:
//   1. Gumawa ng bcrypt hash:  node scripts/hash-password.js "bagong-password"
//   2. Sa HostForge, idagdag ang environment variable FILE_EXPORT_PASSWORD_RESET_HASH = <ang hash> (secret).
//   3. I-redeploy. Pagka-boot, ia-update nito ang "file_export_password_hash" sa settings table.
//   4. IMPORTANTE: tanggalin ang environment variable at ang file na ito pagkatapos,
//      kung hindi, ibabalik nito ang password na iyon sa bawat restart.
//
// Na-load ito sa pamamagitan ng:  import "./services/fileExportPasswordReset.js";  sa src/server.js
import { q } from "../db.js";

const KEY = "file_export_password_hash";
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

async function applyReset() {
  // Binabasa dito (hindi sa import time) para siguradong na-load na ang dotenv.
  const hash = process.env.FILE_EXPORT_PASSWORD_RESET_HASH?.trim();
  if (!hash) return;

  if (!BCRYPT_RE.test(hash)) {
    console.warn("⚠️ FILE_EXPORT_PASSWORD_RESET_HASH is not a valid bcrypt hash. Nothing changed.");
    return;
  }

  try {
    const rows = await q(`SELECT "key" FROM settings WHERE "key" = :k LIMIT 1`, { k: KEY });
    if (!rows.length) {
      console.warn(`⚠️ File export password reset skipped: no "${KEY}" row in settings. Nothing changed.`);
      return;
    }
    await q(`UPDATE settings SET value = :value, updated_at = NOW() WHERE "key" = :k`, {
      value: hash,
      k: KEY,
    });
    console.log("🔑 File export password was reset from FILE_EXPORT_PASSWORD_RESET_HASH. Remove that variable now.");
  } catch (err) {
    console.warn("⚠️ File export password reset failed:", err.message);
  }
}

// Maghintay ng ilang segundo para handa na ang database connection pagka-boot.
setTimeout(applyReset, 5000);