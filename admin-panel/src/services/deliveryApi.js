import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuth } from '../app/baseQuery';

export const deliveryApi = createApi({
  reducerPath: 'deliveryApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['DeliveryDashboard', 'DeliveryOrder'],
  endpoints: (builder) => ({
    getMyDeliveryDashboard: builder.query({
      query: () => '/deliveries/me/dashboard',
      providesTags: ['DeliveryDashboard', 'DeliveryOrder'],
    }),
    listMyDeliveryOrders: builder.query({
      query: (params = {}) => ({
        url: '/deliveries/me/orders',
        params,
      }),
      providesTags: (result) => [
        'DeliveryOrder',
        ...(result?.items ?? []).map((order) => ({ type: 'DeliveryOrder', id: order.orderId })),
      ],
    }),
    getMyDeliveryOrder: builder.query({
      query: (orderId) => `/deliveries/me/orders/${orderId}`,
      providesTags: (_result, _error, orderId) => [{ type: 'DeliveryOrder', id: orderId }],
    }),
    updateMyAvailability: builder.mutation({
      query: (payload) => ({
        url: '/deliveries/me/availability',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['DeliveryDashboard'],
    }),
    acceptMyDeliveryOrder: builder.mutation({
      query: (orderId) => ({
        url: `/deliveries/me/orders/${orderId}/accept`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, orderId) => [
        'DeliveryDashboard',
        'DeliveryOrder',
        { type: 'DeliveryOrder', id: orderId },
      ],
    }),
    updateMyDeliveryOrderStatus: builder.mutation({
      query: ({ orderId, status }) => ({
        url: `/deliveries/me/orders/${orderId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        'DeliveryDashboard',
        'DeliveryOrder',
        { type: 'DeliveryOrder', id: orderId },
      ],
    }),
  }),
});

export const {
  useAcceptMyDeliveryOrderMutation,
  useGetMyDeliveryDashboardQuery,
  useGetMyDeliveryOrderQuery,
  useListMyDeliveryOrdersQuery,
  useUpdateMyAvailabilityMutation,
  useUpdateMyDeliveryOrderStatusMutation,
} = deliveryApi;
