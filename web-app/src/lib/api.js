const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/$/, '');
let getAuthToken = () => null;

export function setAuthTokenGetter(getToken) {
  getAuthToken = typeof getToken === 'function' ? getToken : () => null;
}

async function request(path, options = {}) {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data?.data ?? data;
}

export const api = {
  post(path, body, options = {}) {
    return request(path, {
      method: 'POST',
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
};

