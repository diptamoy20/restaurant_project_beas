import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuth } from '../app/baseQuery';

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    getDashboardAnalytics: builder.query({
      query: () => '/admin/dashboard',
    }),
    getDashboardOverview: builder.query({
      query: (params = {}) => ({
        url: '/admin/dashboard/overview',
        params,
      }),
    }),
  }),
});

export const { useGetDashboardAnalyticsQuery, useGetDashboardOverviewQuery } = analyticsApi;
