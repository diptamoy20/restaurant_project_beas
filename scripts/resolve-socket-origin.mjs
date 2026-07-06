const TRACKING_NAMESPACE = "/delivery-tracking";

function normalizeUrl(value) {
  return String(value ?? "").trim().replace(/\/$/, "");
}

function isPresent(value) {
  const normalized = normalizeUrl(value);
  return Boolean(normalized && normalized !== "undefined");
}

/**
 * Extract hostname from an http(s) URL (without port).
 */
export function extractHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    const match = String(url ?? "").match(/^https?:\/\/([^/:]+)/i);
    return match?.[1] ?? null;
  }
}

/**
 * Derives socket server origin from the REST API base URL.
 * http://182.73.216.93:7001/api → http://182.73.216.93:7001
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
 * Resolves the Socket.IO server origin for delivery tracking.
 *
 * Priority:
 * 1. publicSocketUrl / VITE_SOCKET_URL — explicit override (GitHub PUBLIC_SOCKET_URL)
 * 2. publicApiUrl / PUBLIC_API_URL — backend's own public URL from backend.env
 * 3. hostname from API base + backendPort — when API is proxied on a different port
 * 4. derive from API base URL (strip /api)
 */
export function resolveSocketOrigin({
  apiBaseUrl,
  socketUrl,
  publicApiUrl,
  backendPort,
} = {}) {
  if (isPresent(socketUrl)) {
    return normalizeUrl(socketUrl);
  }

  if (isPresent(publicApiUrl)) {
    return normalizeUrl(publicApiUrl);
  }

  const apiOrigin = deriveSocketOriginFromApiBase(apiBaseUrl);
  const port = String(backendPort ?? "").trim();

  if (apiOrigin && port && port !== "undefined") {
    const hostname = extractHostname(apiOrigin);

    if (hostname) {
      const protocol = apiOrigin.startsWith("https://") ? "https" : "http";
      return `${protocol}://${hostname}:${port}`;
    }
  }

  return apiOrigin;
}

export function resolveTrackingSocketUrl(options = {}) {
  const explicit = options.trackingSocketUrl;

  if (isPresent(explicit)) {
    const normalized = normalizeUrl(explicit);
    return normalized.endsWith(TRACKING_NAMESPACE)
      ? normalized
      : `${normalized}${TRACKING_NAMESPACE}`;
  }

  const origin = resolveSocketOrigin(options);

  if (origin) {
    return origin.endsWith(TRACKING_NAMESPACE)
      ? origin
      : `${origin}${TRACKING_NAMESPACE}`;
  }

  return `http://localhost:4000${TRACKING_NAMESPACE}`;
}

export function resolveWebAppSocketEnv({
  apiBaseUrl,
  socketUrl,
  trackingSocketUrl,
  publicApiUrl,
  backendPort,
} = {}) {
  const origin = resolveSocketOrigin({
    apiBaseUrl,
    socketUrl,
    publicApiUrl,
    backendPort,
  });

  return {
    VITE_API_BASE_URL: normalizeUrl(apiBaseUrl),
    VITE_SOCKET_URL: origin,
    VITE_TRACKING_SOCKET_URL: resolveTrackingSocketUrl({
      trackingSocketUrl,
      apiBaseUrl,
      socketUrl: origin,
      publicApiUrl,
      backendPort,
    }),
  };
}
