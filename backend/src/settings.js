import { q } from "./db.js";

export async function getSetting(key, fallback = null) {
  const rows = await q("SELECT value FROM settings WHERE `key` = :key LIMIT 1", { key });
  if (!rows[0] || rows[0].value === null) return fallback;
  try {
    return JSON.parse(rows[0].value);
  } catch {
    return rows[0].value;
  }
}

export async function getSettings(keys) {
  const rows = await q(
    `SELECT \`key\`, value FROM settings WHERE \`key\` IN (${keys.map((_, i) => `:k${i}`).join(",")})`,
    Object.fromEntries(keys.map((k, i) => [`k${i}`, k]))
  );
  const result = {};
  for (const row of rows) {
    try {
      result[row.key] = JSON.parse(row.value);
    } catch {
      result[row.key] = row.value;
    }
  }
  return result;
}