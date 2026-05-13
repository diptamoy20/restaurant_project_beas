const AUTH_STORAGE_KEY = 'restaurant-web-auth';

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

    return {
      token: parsed.token,
      refreshToken: parsed.refreshToken ?? null,
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
