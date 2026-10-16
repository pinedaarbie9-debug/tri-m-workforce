import { q } from "./db.js";
import { parseSettingValue } from "./utils/helpers.js";

export async function getSettings(keys = null) {
  try {
    let rows;
    if (Array.isArray(keys) && keys.length > 0) {
      const placeholders = keys.map((_, i) => `:k${i}`).join(",");
      const params = Object.fromEntries(keys.map((k, i) => [`k${i}`, k]));
      rows = await q(`SELECT "key", value FROM settings WHERE "key" IN (${placeholders})`, params);
    } else {
      rows = await q(`SELECT "key", value FROM settings`);
    }
    const result = {};
    for (const row of rows) result[row.key] = parseSettingValue(row.value);
    return result;
  } catch (err) {
    console.error("❌ getSettings error:", err);
    return {};
  }
}