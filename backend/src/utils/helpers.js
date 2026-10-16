export function safeParseJSON(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return null; }
}

// Para sa settings.value (JSON string sa TEXT column)
export function parseSettingValue(value) {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}

export function getZodError(parsed) {
  const issues = parsed?.error?.issues ?? parsed?.error?.errors ?? [];
  return issues[0]?.message ?? "Invalid input.";
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to perform this action." });
    }
    next();
  };
}

// Petsa/oras sa Pilipinas, kahit UTC ang server (iwas "kahapon" na petsa kapag umaga)
export function nowManila() {
  const tz = process.env.APP_TIMEZONE ?? "Asia/Manila";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return {
    dateStr: `${g("year")}-${g("month")}-${g("day")}`,
    timeStr: `${g("hour")}:${g("minute")}:${g("second")}`,
  };
}