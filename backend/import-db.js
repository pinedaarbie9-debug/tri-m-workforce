import fs from "fs";
import mysql from "mysql2/promise";

let sql = fs.readFileSync("./workforce_db.sql", "utf8");

// Fix: MariaDB dump syntax na "DEFAULT uuid()" ay hindi valid sa tunay na MySQL —
// kailangan itong "DEFAULT (uuid())" (naka-parenthesis).
sql = sql.replace(/DEFAULT uuid\(\)/gi, "DEFAULT (uuid())");

const connection = await mysql.createConnection({
  host: "sakura.proxy.rlwy.net",
  port: 11585,
  user: "root",
  password: "ZcRzoetMMlHhVIhKRclEnGTsnGkTBzsA",
  database: "railway",
  multipleStatements: true,
});

console.log("Connected. Importing... this may take a minute.");

try {
  await connection.query(sql);
  console.log("✅ Import successful!");
} catch (err) {
  console.error("❌ Import failed:", err.message);
} finally {
  await connection.end();
}