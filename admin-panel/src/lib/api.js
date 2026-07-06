import { getApiBaseUrl } from '../config/env';

const API_BASE_URL = getApiBaseUrl();

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Type': 'web',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
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

