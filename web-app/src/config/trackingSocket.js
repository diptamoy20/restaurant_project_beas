const TRACKING_NAMESPACE = "/delivery-tracking";

function normalizeUrl(value) {
  return String(value ?? "").trim().replace(/\/$/, "");
}

/**
 * Resolves the Socket.IO namespace URL for delivery tracking.
 *
 * Priority:
 * 1. VITE_TRACKING_SOCKET_URL — full URL including namespace
 *    e.g. http://182.73.216.93:7005/delivery-tracking
 * 2. VITE_SOCKET_URL — server origin only; namespace is appended
 *    e.g. http://localhost:4000 → http://localhost:4000/delivery-tracking
 * 3. VITE_API_BASE_URL — derived origin (local fallback)
 */
export function resolveTrackingSocketUrl() {
  const explicitSocketUrl = import.meta.env.VITE_TRACKING_SOCKET_URL;

  if (explicitSocketUrl && explicitSocketUrl !== "undefined") {
    return normalizeUrl(explicitSocketUrl);
  }

  const socketOrigin = import.meta.env.VITE_SOCKET_URL;

  if (socketOrigin && socketOrigin !== "undefined") {
    const origin = normalizeUrl(socketOrigin);

    if (origin.endsWith(TRACKING_NAMESPACE)) {
      return origin;
    }

    return `${origin}${TRACKING_NAMESPACE}`;
  }

  const apiBase = normalizeUrl(
    import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api",
  );
  const origin = apiBase.replace(/\/api$/, "");

  return `${origin}${TRACKING_NAMESPACE}`;
}

export function isTrackingSocketDebugEnabled() {
  return import.meta.env.VITE_DEBUG_SOCKET === "true";
}
