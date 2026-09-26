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
  queueLimit: 0,
  namedPlaceholders: true,

  // Mas mahaba ang timeout bago mag-give up sa paggawa ng koneksyon —
  // importante ito para sa proxied host gaya ng Railway (sakura.proxy.rlwy.net),
  // dahil mas mabagal ang round-trip kesa sa local DB.
  connectTimeout: 20000, // 20 segundo

  // Pinapanatiling "buhay" ang mga idle connection sa pool para hindi
  // basta i-drop ng Railway proxy pagkatapos ng ilang minuto ng katahimikan.
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// Maikling helper — tumatawag ng query at ibinabalik agad ang rows.
// May retry (1x lang) kung ang error ay connection-related (timeout/reset),
// dahil kadalasan gumagana na ang pangalawang subok pagkatapos mag-refresh
// ang pool ng koneksyon.
const RETRYABLE_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "PROTOCOL_CONNECTION_LOST",
  "ECONNREFUSED",
]);

export async function q(sql, params = {}, _isRetry = false) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (err) {
    if (!_isRetry && RETRYABLE_CODES.has(err.code)) {
      console.warn(`⚠️ DB query failed (${err.code}), retrying once...`);
      await new Promise((r) => setTimeout(r, 500));
      return q(sql, params, true);
    }
    console.error("❌ DB query error:", err.code ?? err.message);
    throw err;
  }
}

// Opsyonal: tawagin ito sa server startup para agad malaman kung
// may problema sa koneksyon bago pa tumanggap ng requests.
export async function pingDb() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    console.log("✅ DB connection OK");
  } finally {
    conn.release();
  }
}