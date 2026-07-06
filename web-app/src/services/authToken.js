import { loadUserFromStorage } from "./authStorage";

let getTokenFromStore = null;
let refreshAccessToken = null;

export function setAuthTokenResolver({ getToken, refreshToken }) {
  getTokenFromStore = typeof getToken === "function" ? getToken : null;
  refreshAccessToken = typeof refreshToken === "function" ? refreshToken : null;
}

function readStoredToken() {
  const token = loadUserFromStorage()?.token ?? null;

  if (!token || token === "undefined" || token === "null") {
    return null;
  }

  return token.trim();
}

export function getAccessToken() {
  return getTokenFromStore?.() ?? readStoredToken();
}

function decodeTokenExpiryMs(token) {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const decoded = JSON.parse(atob(padded));

    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token, skewMs = 30_000) {
  const expiresAt = decodeTokenExpiryMs(token);

  if (expiresAt === null) {
    return false;
  }

  return expiresAt <= Date.now() + skewMs;
}

export async function getValidAccessToken({ forceRefresh = false } = {}) {
  let token = getAccessToken();

  if (!token) {
    return null;
  }

  const shouldRefresh =
    forceRefresh || isTokenExpired(token);

  if (shouldRefresh && refreshAccessToken) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      token = refreshed;
    }
  }

  return token;
}

export function isAuthTokenError(message) {
  const normalized = String(message ?? "").toLowerCase();

  return (
    normalized.includes("token") ||
    normalized.includes("unauthorized") ||
    normalized.includes("sign in again")
  );
}
