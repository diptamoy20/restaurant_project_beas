const TRACKING_NAMESPACE = "/delivery-tracking";

function normalizeUrl(value) {
  return String(value ?? "").trim().replace(/\/$/, "");
}

function isLocalhostHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isLocalhostUrl(url) {
  try {
    return isLocalhostHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Derives socket server origin from the REST API base URL.
 * http://182.73.216.93:7005/api → http://182.73.216.93:7005
 */
export function deriveSocketOriginFromApiBase(apiBaseUrl) {
  const normalized = normalizeUrl(apiBaseUrl);

  if (!normalized || normalized === "undefined") {
    return null;
  }

  if (normalized.endsWith("/api")) {
    return normalized.slice(0, -4);
  }

  return normalized;
}

/**
 * Resolves the Socket.IO namespace URL for delivery tracking.
 *
 * `/delivery-tracking` is a Socket.IO namespace (not a custom HTTP path).
 * The client still polls at `{origin}/socket.io/` while joining namespace `/delivery-tracking`.
 *
 * Priority:
 * 1. VITE_TRACKING_SOCKET_URL — full URL including namespace
 * 2. VITE_SOCKET_PORT + API host — when REST API is proxied on a different port
 * 3. VITE_SOCKET_URL — server origin; namespace is appended
 * 4. VITE_API_BASE_URL — origin derived by stripping /api
 * 5. Local development fallback
 *
 * Production safety: if VITE_SOCKET_URL points to localhost but the API base
 * URL is remote, localhost is ignored so deploy builds never target local sockets.
 */
export function resolveTrackingSocketUrl() {
  const explicitSocketUrl = import.meta.env.VITE_TRACKING_SOCKET_URL;

  if (explicitSocketUrl && explicitSocketUrl !== "undefined") {
    return normalizeUrl(explicitSocketUrl);
  }

  const apiOrigin = deriveSocketOriginFromApiBase(import.meta.env.VITE_API_BASE_URL);
  const socketPort = import.meta.env.VITE_SOCKET_PORT;

  if (socketPort && socketPort !== "undefined" && apiOrigin) {
    try {
      const base = apiOrigin.startsWith("http") ? apiOrigin : `http://${apiOrigin}`;
      const url = new URL(base);
      url.port = String(socketPort);
      return `${normalizeUrl(url.origin)}${TRACKING_NAMESPACE}`;
    } catch {
      // fall through to other resolvers
    }
  }

  const socketOrigin = import.meta.env.VITE_SOCKET_URL;

  if (socketOrigin && socketOrigin !== "undefined") {
    const origin = normalizeUrl(socketOrigin);

    if (
      import.meta.env.PROD &&
      isLocalhostUrl(origin) &&
      apiOrigin &&
      !isLocalhostUrl(apiOrigin)
    ) {
      return `${normalizeUrl(apiOrigin)}${TRACKING_NAMESPACE}`;
    }

    if (origin.endsWith(TRACKING_NAMESPACE)) {
      return origin;
    }

    return `${origin}${TRACKING_NAMESPACE}`;
  }

  if (apiOrigin) {
    return `${normalizeUrl(apiOrigin)}${TRACKING_NAMESPACE}`;
  }

  return `http://localhost:4000${TRACKING_NAMESPACE}`;
}

export function isTrackingSocketDebugEnabled() {
  return import.meta.env.VITE_DEBUG_SOCKET === "true";
}

/**
 * Describes which env variable selected the socket URL (for debug logging).
 */
export function resolveTrackingSocketSource() {
  const explicitSocketUrl = import.meta.env.VITE_TRACKING_SOCKET_URL;

  if (explicitSocketUrl && explicitSocketUrl !== "undefined") {
    return "VITE_TRACKING_SOCKET_URL";
  }

  if (import.meta.env.VITE_SOCKET_PORT && import.meta.env.VITE_SOCKET_PORT !== "undefined") {
    return "VITE_SOCKET_PORT";
  }

  const socketOrigin = import.meta.env.VITE_SOCKET_URL;

  if (socketOrigin && socketOrigin !== "undefined") {
    return "VITE_SOCKET_URL";
  }

  if (deriveSocketOriginFromApiBase(import.meta.env.VITE_API_BASE_URL)) {
    return "VITE_API_BASE_URL";
  }

  return "fallback";
}
