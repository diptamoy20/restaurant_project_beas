const TRACKING_NAMESPACE = "/delivery-tracking";

function normalizeUrl(value) {
  return String(value ?? "").trim().replace(/\/$/, "");
}

function isSet(value) {
  const normalized = normalizeUrl(value);
  return Boolean(normalized && normalized !== "undefined");
}

/**
 * Resolves the delivery-tracking socket URL from plain key/value env entries.
 * Used by deploy verification; mirrors web-app/src/config/trackingSocket.js.
 */
export function resolveTrackingUrlFromEnv(env = {}) {
  if (isSet(env.VITE_TRACKING_SOCKET_URL)) {
    return normalizeUrl(env.VITE_TRACKING_SOCKET_URL);
  }

  if (isSet(env.VITE_SOCKET_URL)) {
    const origin = normalizeUrl(env.VITE_SOCKET_URL);
    return origin.endsWith(TRACKING_NAMESPACE)
      ? origin
      : `${origin}${TRACKING_NAMESPACE}`;
  }

  const apiBase = normalizeUrl(env.VITE_API_BASE_URL);

  if (apiBase) {
    const origin = apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase;
    return `${origin}${TRACKING_NAMESPACE}`;
  }

  return "";
}
