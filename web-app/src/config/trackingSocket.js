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
 * Priority:
 * 1. VITE_TRACKING_SOCKET_URL — full URL including namespace
 * 2. VITE_SOCKET_URL — server origin; namespace is appended
 * 3. VITE_API_BASE_URL — origin derived by stripping /api
 * 4. Local development fallback
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
