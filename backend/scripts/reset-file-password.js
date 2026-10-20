// backend/scripts/reset-file-password.js
// Mag-set ng bagong File Export Password (bcrypt) nang direkta sa database.
//
// Patakbuhin sa folder na `backend`:
//   node scripts/reset-file-password.js "bagong-password"
//
// Kailangan: may .env sa backend na may DB credentials na naaabot mula sa computer mo.
// Kung hindi naaabot ang production DB mula sa computer mo, gamitin na lang ang
//   node scripts/hash-password.js "bagong-password"
// at i-paste ang hash sa SQL na ipapatakbo sa HostForge > Databases.
import bcrypt from "bcryptjs";

try {
  await import("dotenv/config");
} catch {
  // walang dotenv: gagamitin ang environment variables na naka-set na
}

const { q } = await import("../src/db.js");

const KEY = "file_export_password_hash";
const password = process.argv[2];

if (!password || password.length < 4) {
  console.log('Gamit: node scripts/reset-file-password.js "bagong-password"  (minimum 4 characters)');
  process.exit(1);
}

try {
  const existing = await q(`SELECT "key" FROM settings WHERE "key" = :k LIMIT 1`, { k: KEY });
  if (!existing.length) {
    console.error(`Walang row na "${KEY}" sa settings table. Walang binago.`);
    console.error("Mag-set muna ng password sa Settings page (Change File Password), o ipaalam sa developer.");
    process.exit(2);
  }

  const hash = await bcrypt.hash(password, 10);
  await q(`UPDATE settings SET value = :value, updated_at = NOW() WHERE "key" = :k`, { value: hash, k: KEY });
  console.log("File export password updated. Subukan ang bagong password sa susunod na download.");
  process.exit(0);
} catch (err) {
  console.error("Failed to reset file export password:", err.message);
  process.exit(1);
}