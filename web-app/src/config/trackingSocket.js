const TRACKING_NAMESPACE = "/delivery-tracking";

function normalizeUrl(value) {
  return String(value ?? "").trim().replace(/\/$/, "");
}

function isSet(value) {
  const normalized = normalizeUrl(value);
  return Boolean(normalized && normalized !== "undefined");
}

/**
 * Reads the delivery-tracking Socket.IO namespace URL from .env.
 *
 * `/delivery-tracking` is a Socket.IO namespace. HTTP polling still uses
 * `{origin}/socket.io/` on the server defined by VITE_TRACKING_SOCKET_URL
 * or VITE_SOCKET_URL.
 */
export function resolveTrackingSocketUrl() {
  if (isSet(import.meta.env.VITE_TRACKING_SOCKET_URL)) {
    return normalizeUrl(import.meta.env.VITE_TRACKING_SOCKET_URL);
  }

  if (isSet(import.meta.env.VITE_SOCKET_URL)) {
    const origin = normalizeUrl(import.meta.env.VITE_SOCKET_URL);
    return origin.endsWith(TRACKING_NAMESPACE)
      ? origin
      : `${origin}${TRACKING_NAMESPACE}`;
  }

  return `http://localhost:4000${TRACKING_NAMESPACE}`;
}

export function isTrackingSocketDebugEnabled() {
  return import.meta.env.VITE_DEBUG_SOCKET === "true";
}
