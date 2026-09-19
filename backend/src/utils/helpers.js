// backend/src/utils/helpers.js
// Shared helpers para sa lahat ng routes

export function safeParseJSON(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function getZodError(parsed) {
  const issues = parsed?.error?.issues ?? parsed?.error?.errors ?? [];
  return issues[0]?.message ?? "Invalid input.";
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "You do not have permission to perform this action." });
    }
    next();
  };
}