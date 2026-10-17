// backend/src/utils/errorResponse.js
export function safeError(res, err, fallbackMessage = "Request failed", statusCode = 500) {
  console.error(`❌ [${new Date().toISOString()}]`, err?.code ?? "", err?.message ?? err);
  if (err?.stack) console.error(err.stack);

  const debug = process.env.DEBUG_ERRORS === "true";

  if (process.env.NODE_ENV === "production" && !debug) {
    return res.status(statusCode).json({ error: fallbackMessage });
  }

  return res.status(statusCode).json({
    error: fallbackMessage,
    ...(debug || process.env.NODE_ENV !== "production"
      ? { debug: err?.message ?? String(err), code: err?.code ?? null }
      : {}),
  });
}

export function validationError(res, message) {
  return res.status(400).json({ error: message });
}