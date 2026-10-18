// backend/src/services/fileExportPasswordReset.js
// PANSAMANTALA. Isang beses na reset ng File Export Password.
//
// Paano gamitin:
//   1. Gumawa ng bcrypt hash (sa folder na `backend`):
//        node -e "console.log(require('bcryptjs').hashSync(process.argv[1],10))" 'bagong-password'
//   2. Sa HostForge, idagdag ang environment variable FILE_EXPORT_PASSWORD_RESET_HASH = <ang hash> (secret).
//   3. I-redeploy. Pagka-boot, ise-save nito ang "file_export_password_hash" sa settings table
//      (UPDATE kung may row na, INSERT kung wala pa).
//   4. IMPORTANTE: tanggalin ang environment variable (at ang file na ito) pagkatapos,
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

  // Parehong format ng Settings page (routes/settings.js): JSON string ang naka-save, kaya may quotes.
  const stored = JSON.stringify(hash);

  try {
    const rows = await q(`SELECT "key" FROM settings WHERE "key" = :k LIMIT 1`, { k: KEY });

    if (rows.length) {
      await q(`UPDATE settings SET value = :value, updated_at = NOW() WHERE "key" = :k`, {
        value: stored,
        k: KEY,
      });
      console.log("🔑 File export password was reset from FILE_EXPORT_PASSWORD_RESET_HASH. Remove that variable now.");
    } else {
      await q(
        `INSERT INTO settings ("key", value, category, label, description)
         VALUES (:k, :value, 'general', 'File Export Password', 'Password required before downloading any exported file')`,
        { k: KEY, value: stored }
      );
      console.log("🔑 File export password row was created from FILE_EXPORT_PASSWORD_RESET_HASH. Remove that variable now.");
    }
  } catch (err) {
    console.warn("⚠️ File export password reset failed:", err.message);
  }
}

// Maghintay ng ilang segundo para handa na ang database connection pagka-boot.
setTimeout(applyReset, 5000);