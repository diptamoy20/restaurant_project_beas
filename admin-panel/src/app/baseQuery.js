import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { logout } from '../features/auth/authSlice';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api').replace(/\/$/, ''),
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

  if (result.data && typeof result.data === 'object' && result.data.success === true && 'data' in result.data) {
    return {
      ...result,
      data: result.data.data,
    };
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

