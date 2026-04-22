import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { logout } from '../features/auth/authSlice';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: (
    import.meta.env.VITE_API_BASE_URL ||
    `${(import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '')}/api`
  ).replace(/\/$/, ''),
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;

    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    headers.set('content-type', 'application/json');
    return headers;
  },
});

export async function baseQueryWithAuth(args, api, extraOptions) {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    api.dispatch(logout());
  }

  return result;
}

export function createUnavailableHandler(feature) {
  return async () => ({
    error: {
      status: 'CUSTOM_ERROR',
      error: `${feature} is not exposed by the current backend API.`,
    },
  });
}

