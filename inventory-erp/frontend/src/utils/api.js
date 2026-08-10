import { getApiBaseUrl } from '../config/env';

const API_BASE_URL = getApiBaseUrl();

export async function apiFetch(endpoint, options = {}) {
  const auth = JSON.parse(localStorage.getItem('erp_auth')) || {};
  const headers = {
    'Content-Type': 'application/json',
    ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr) {
    throw new Error(`Network error — could not reach the API at ${API_BASE_URL}`);
  }

  if (response.status === 401) {
    localStorage.removeItem('erp_auth');
    window.location.href = '/login';
    throw new Error('Session expired — please log in again');
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorData = await response.json();
      message = errorData.message || errorData.error || message;
    } catch { /* non-JSON response */ }
    throw new Error(message);
  }

  return response.json();
}
