import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "workforce_db",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

// Maikling helper — tumatawag ng query at ibinabalik agad ang rows
export async function q(sql, params = {}) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
