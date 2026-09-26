// backend/src/utils/errorResponse.js
// Centralized safe error handler — hindi nag-le-leak ng DB info sa client

export function safeError(res, err, fallbackMessage = "Request failed", statusCode = 500) {
  // I-log ang full error sa server logs (para sa debugging)
  console.error(`❌ [${new Date().toISOString()}]`, err);

  // Sa production, huwag ipakita ang details
  if (process.env.NODE_ENV === "production") {
    return res.status(statusCode).json({ error: fallbackMessage });
  }

  // Sa development, ipakita ang message (pero hindi ang stack)
  return res.status(statusCode).json({
    error: err?.message ?? fallbackMessage,
  });
}

export function validationError(res, message) {
  return res.status(400).json({ error: message });
}