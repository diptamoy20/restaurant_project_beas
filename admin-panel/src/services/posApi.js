import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuth } from '../app/baseQuery';

export const posApi = createApi({
  reducerPath: 'posApi',
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    getPosDashboard: builder.query({
      query: () => '/pos/dashboard',
    }),
  }),
});

export const { useGetPosDashboardQuery } = posApi;
