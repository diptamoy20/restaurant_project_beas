const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api"
).replace(/\/$/, "");
let getAuthToken = () => null;
let handleUnauthorized = () => {};
let refreshAuthToken = null;
let refreshRequest = null;
const debugAuth = import.meta.env.VITE_DEBUG_AUTH === "true";

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.path = options.path;
    this.sessionExpired = options.sessionExpired ?? false;
  }
}

export function setAuthTokenGetter(getToken) {
  getAuthToken = typeof getToken === "function" ? getToken : () => null;
}

export function setUnauthorizedHandler(handler) {
  handleUnauthorized = typeof handler === "function" ? handler : () => {};
}

export function setAuthRefreshHandler(handler) {
  refreshAuthToken = typeof handler === "function" ? handler : null;
}

function maskToken(token) {
  if (!token) {
    return "missing";
  }

  if (token.length <= 12) {
    return "present";
  }

  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

async function request(path, options = {}) {
  const {
    skipAuthRefresh = false,
    skipUnauthorizedHandler = false,
    ...fetchOptions
  } = options;
  const token = getAuthToken();
  const normalizedPath = normalizePath(path);
  const hasFormDataBody =
    typeof FormData !== "undefined" && fetchOptions.body instanceof FormData;

  const makeHeaders = (authToken) => ({
    ...(!hasFormDataBody && { "Content-Type": "application/json" }),
    "X-Client-Type": "web",
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
    ...(fetchOptions.headers || {}),
  });

  const performRequest = (authToken) =>
    fetch(`${API_BASE_URL}${normalizedPath}`, {
      ...fetchOptions,
      headers: makeHeaders(authToken),
    });

  let response = await performRequest(token);
  let data = await response.json().catch(() => ({}));
  let usedToken = token;

  if (!response.ok && response.status === 401 && token && refreshAuthToken && !skipAuthRefresh) {
    try {
      refreshRequest = refreshRequest ?? Promise.resolve(refreshAuthToken()).finally(() => {
        refreshRequest = null;
      });

      const refreshedToken = await refreshRequest;

      if (refreshedToken) {
        response = await performRequest(refreshedToken);
        data = await response.json().catch(() => ({}));
        usedToken = refreshedToken;
      }
    } catch (error) {
      if (debugAuth) {
        console.debug("[auth/api] token refresh failed", {
          path,
          message: error.message,
        });
      }
    }
  }

  if (!response.ok) {
    const isUnauthorized = response.status === 401;
    const message = isUnauthorized
      ? "Session expired. Please login again."
      : data.message || "Request failed";

    if (debugAuth) {
      console.debug("[auth/api] response error", {
        path,
        status: response.status,
        message: data.message,
      });
    }

    if (isUnauthorized && !skipUnauthorizedHandler) {
      handleUnauthorized({ path, token: usedToken });
    }

    throw new ApiError(message, {
      status: response.status,
      path,
      sessionExpired: isUnauthorized,
    });
  }

  return data?.data ?? data;
}

function normalizePath(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (API_BASE_URL.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return normalizedPath.replace(/^\/api/, '');
  }

  return normalizedPath;
}

export const api = {
  request,
  post(path, body, options = {}) {
    return request(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    });
  },
  get(path, options = {}) {
    return request(path, {
      method: 'GET',
      ...options,
    });
  },
  put(path, body, options = {}) {
    return request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    });
  },
  patch(path, body, options = {}) {
    return request(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    });
  },
  delete(path, options = {}) {
    return request(path, {
      method: "DELETE",
      ...options,
    });
  },
};
