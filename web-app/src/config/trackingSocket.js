const TRACKING_NAMESPACE = "/delivery-tracking";

function normalizeUrl(value) {
  return String(value ?? "").trim().replace(/\/$/, "");
}

function isSet(value) {
  const normalized = normalizeUrl(value);
  return Boolean(normalized && normalized !== "undefined");
}

function isLocalhostHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isLocalhostUrl(url) {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `http://${url}`);
    return isLocalhostHost(parsed.hostname);
  } catch {
    return false;
  }
}

function appendNamespace(origin) {
  const normalized = normalizeUrl(origin);
  return normalized.endsWith(TRACKING_NAMESPACE)
    ? normalized
    : `${normalized}${TRACKING_NAMESPACE}`;
}

function deriveFromApiBase(apiBaseUrl) {
  const apiBase = normalizeUrl(apiBaseUrl);

  if (!apiBase) {
    return null;
  }

  const origin = apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase;
  return appendNamespace(origin);
}

/**
 * Reads the delivery-tracking Socket.IO namespace URL from .env.
 *
 * In development, remote VITE_TRACKING_SOCKET_URL values are ignored so a
 * single .env can keep production socket settings for builds while local
 * dev uses localhost (or VITE_DEV_TRACKING_SOCKET_URL).
 */
export function resolveTrackingSocketUrl() {
  if (import.meta.env.DEV) {
    if (isSet(import.meta.env.VITE_DEV_TRACKING_SOCKET_URL)) {
      return normalizeUrl(import.meta.env.VITE_DEV_TRACKING_SOCKET_URL);
    }

    if (isSet(import.meta.env.VITE_DEV_SOCKET_URL)) {
      return appendNamespace(import.meta.env.VITE_DEV_SOCKET_URL);
    }

    if (isSet(import.meta.env.VITE_SOCKET_URL) && isLocalhostUrl(import.meta.env.VITE_SOCKET_URL)) {
      return appendNamespace(import.meta.env.VITE_SOCKET_URL);
    }

    if (isSet(import.meta.env.VITE_DEV_API_BASE_URL)) {
      return deriveFromApiBase(import.meta.env.VITE_DEV_API_BASE_URL);
    }

    if (isSet(import.meta.env.VITE_API_BASE_URL) && isLocalhostUrl(import.meta.env.VITE_API_BASE_URL)) {
      return deriveFromApiBase(import.meta.env.VITE_API_BASE_URL);
    }

    return `http://localhost:4000${TRACKING_NAMESPACE}`;
  }

  if (isSet(import.meta.env.VITE_TRACKING_SOCKET_URL)) {
    return normalizeUrl(import.meta.env.VITE_TRACKING_SOCKET_URL);
  }

  if (isSet(import.meta.env.VITE_SOCKET_URL)) {
    return appendNamespace(import.meta.env.VITE_SOCKET_URL);
  }

  const derived = deriveFromApiBase(import.meta.env.VITE_API_BASE_URL);

  if (derived) {
    return derived;
  }

  return `http://localhost:4000${TRACKING_NAMESPACE}`;
}

export function isTrackingSocketDebugEnabled() {
  return import.meta.env.VITE_DEBUG_SOCKET === "true";
}
