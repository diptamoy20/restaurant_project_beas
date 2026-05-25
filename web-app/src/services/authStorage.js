const AUTH_STORAGE_KEY = "restaurant-web-auth";

function decodeJwtExpiry(token) {
  try {
    const payload = token?.split(".")?.[1];

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

function resolveRefreshExpiry(parsed) {
  if (parsed?.refreshTokenExpiresAt) {
    const timestamp = Date.parse(parsed.refreshTokenExpiresAt);

    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  return decodeJwtExpiry(parsed?.refreshToken);
}

function readStorage(storage) {
  try {
    const raw = storage.getItem(AUTH_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!parsed?.token || !parsed?.user) {
      return null;
    }

    const refreshTokenExpiresAtMs = resolveRefreshExpiry(parsed);

    if (
      refreshTokenExpiresAtMs !== null &&
      refreshTokenExpiresAtMs <= Date.now()
    ) {
      storage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return {
      token: parsed.token,
      refreshToken: parsed.refreshToken ?? null,
      refreshTokenExpiresAt: parsed.refreshTokenExpiresAt ?? null,
      user: parsed.user,
    };
  } catch {
    return null;
  }
}

export function loadUserFromStorage() {
  return readStorage(localStorage) ?? readStorage(sessionStorage);
}

export function saveUserToStorage(auth, rememberMe = true) {
  const storage = rememberMe ? localStorage : sessionStorage;
  const fallbackStorage = rememberMe ? sessionStorage : localStorage;

  fallbackStorage.removeItem(AUTH_STORAGE_KEY);
  storage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      token: auth.token,
      refreshToken: auth.refreshToken,
      refreshTokenExpiresAt: auth.refreshTokenExpiresAt,
      user: auth.user,
    }),
  );
}

export function updateStoredUser(auth) {
  const useLocalStorage =
    localStorage.getItem(AUTH_STORAGE_KEY) !== null ||
    sessionStorage.getItem(AUTH_STORAGE_KEY) === null;

  saveUserToStorage(auth, useLocalStorage);
}

export function clearStoredUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}
