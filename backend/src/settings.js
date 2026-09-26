// backend/src/settings.js
// Helper function para kumuha ng settings mula sa DB

import { q } from "./db.js";

/**
 * Kunin ang mga settings mula sa DB.
 * @param {string[]} [keys] - Optional. Kung ibibigay, ito lang ang kukunin.
 * @returns {Promise<Object>} - Object na may key-value pairs.
 */
export async function getSettings(keys = null) {
  try {
    let rows;
    if (Array.isArray(keys) && keys.length > 0) {
      const placeholders = keys.map((_, i) => `:k${i}`).join(",");
      const params = Object.fromEntries(keys.map((k, i) => [`k${i}`, k]));
      rows = await q(
        `SELECT \`key\`, value FROM settings WHERE \`key\` IN (${placeholders})`,
        params
      );
    } else {
      rows = await q("SELECT `key`, value FROM settings");
    }

    const result = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch {
        result[row.key] = row.value;
      }
    }
    return result;
  } catch (err) {
    console.error("❌ getSettings error:", err);
    return {};
  }
}