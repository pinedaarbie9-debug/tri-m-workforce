// Patakbuhin: node scripts/hash-password.js "yourpassword"
// I-copy yung output tapos i-UPDATE sa users table mo sa phpMyAdmin:
//   UPDATE users SET password_hash = '<paste dito>' WHERE email = 'admin@workforce.io';
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.log("Gamit: node scripts/hash-password.js <password>");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log(hash);
