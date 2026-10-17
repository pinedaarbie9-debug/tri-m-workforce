import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool, types } = pg;
const TZ = process.env.APP_TIMEZONE ?? "Asia/Manila";

types.setTypeParser(20, (v) => parseInt(v, 10)); // bigint (COUNT) -> number
types.setTypeParser(1082, (v) => v);             // DATE -> "YYYY-MM-DD"

// Ipakita sa log kung saan talaga kumokonekta (walang password)
(function logDbTarget() {
  try {
    const u = new URL(process.env.DATABASE_URL);
    console.log(
      `🔌 DB target: ${u.hostname}:${u.port || "5432"}/${u.pathname.slice(1)} (user: ${u.username}, ssl: ${process.env.DB_SSL === "true"})`
    );
  } catch {
    console.error("❌ DATABASE_URL is missing or invalid!");
  }
  if (!process.env.JWT_SECRET) console.error("❌ JWT_SECRET is missing!");
})();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  max: 10,
  connectionTimeoutMillis: 8000,
  idleTimeoutMillis: 30000,
  keepAlive: true,
});

// Para tama ang NOW() / CURRENT_DATE sa oras ng Pilipinas
pool.on("connect", (client) => {
  client.query(`SET TIME ZONE '${TZ}'`).catch((e) =>
    console.error("⚠️ Failed to set timezone:", e.message)
  );
});
pool.on("error", (err) => console.error("⚠️ Idle PG client error:", err.message));

// ":name" -> "$n", `backtick` -> "double quote". Hindi ginagalaw ang string literals at "::" casts.
function convertQuery(sql, params = {}) {
  const values = [];
  const positions = new Map();
  let out = "";
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const ch = sql[i];

    if (ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") break;
        j++;
      }
      out += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }

    if (ch === "`") {
      const j = sql.indexOf("`", i + 1);
      if (j !== -1) { out += `"${sql.slice(i + 1, j)}"`; i = j + 1; continue; }
    }

    if (ch === ":") {
      if (sql[i + 1] === ":") { out += "::"; i += 2; continue; }
      const m = /^:([A-Za-z_]\w*)/.exec(sql.slice(i));
      if (m) {
        const name = m[1];
        if (!(name in params)) throw new Error(`Missing SQL parameter :${name}`);
        if (!positions.has(name)) {
          let v = params[name];
          if (v === undefined) v = null;
          if (v !== null && typeof v === "object" && !(v instanceof Date) && !Buffer.isBuffer(v)) {
            v = JSON.stringify(v);
          }
          values.push(v);
          positions.set(name, values.length);
        }
        out += `$${positions.get(name)}`;
        i += m[0].length;
        continue;
      }
    }

    out += ch;
    i++;
  }
  return { text: out, values };
}

const RETRYABLE_CODES = new Set(["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "57P01", "08006", "08003"]);

export async function q(sql, params = {}, _isRetry = false) {
  try {
    const { text, values } = convertQuery(sql, params);
    const result = await pool.query(text, values);
    return result.rows;
  } catch (err) {
    if (!_isRetry && RETRYABLE_CODES.has(err.code)) {
      console.warn(`⚠️ DB query failed (${err.code}), retrying once...`);
      await new Promise((r) => setTimeout(r, 500));
      return q(sql, params, true);
    }
    console.error("❌ DB query error:", err.code ?? err.message, err.detail ?? "");
    throw err;
  }
}

export async function pingDb() {
  await pool.query("SELECT 1");
  console.log("✅ DB connection OK");
}