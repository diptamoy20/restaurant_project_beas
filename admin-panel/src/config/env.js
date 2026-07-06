function normalizeUrl(value) {
  return String(value ?? "").trim().replace(/\/$/, "");
}

function isSet(value) {
  const normalized = normalizeUrl(value);
  return Boolean(normalized && normalized !== "undefined");
}

export function getApiBaseUrl() {
  if (import.meta.env.DEV) {
    return normalizeUrl(
      import.meta.env.VITE_DEV_API_BASE_URL || "http://localhost:4000/api",
    );
  }

  return normalizeUrl(
    import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api",
  );
}

export function getSocketOrigin() {
  if (import.meta.env.DEV) {
    if (isSet(import.meta.env.VITE_DEV_SOCKET_URL)) {
      return normalizeUrl(import.meta.env.VITE_DEV_SOCKET_URL);
    }

    const devApi = normalizeUrl(
      import.meta.env.VITE_DEV_API_BASE_URL || "http://localhost:4000/api",
    );

    if (devApi.endsWith("/api")) {
      return devApi.slice(0, -4);
    }

    return devApi || "http://localhost:4000";
  }

  if (isSet(import.meta.env.VITE_SOCKET_URL)) {
    return normalizeUrl(import.meta.env.VITE_SOCKET_URL);
  }

  const apiBase = normalizeUrl(import.meta.env.VITE_API_BASE_URL);

  if (apiBase.endsWith("/api")) {
    return apiBase.slice(0, -4);
  }

  return apiBase || "http://localhost:4000";
}
