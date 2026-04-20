import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuth } from '../app/baseQuery';

function unwrapApiData(response) {
  return response?.data ?? response;
}

function unwrapApiError(response) {
  return response?.data ?? response;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (payload) => ({
        url: '/auth/login/role',
        method: 'POST',
        body: payload,
      }),
      transformResponse: unwrapApiData,
      transformErrorResponse: unwrapApiError,
    }),
    getMe: builder.query({
      query: () => '/auth/me',
      transformResponse: unwrapApiData,
      transformErrorResponse: unwrapApiError,
    }),
  }),
});

export const { useLoginMutation, useGetMeQuery } = authApi;

