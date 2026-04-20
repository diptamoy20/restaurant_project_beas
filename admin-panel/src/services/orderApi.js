import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuth, createUnavailableHandler } from '../app/baseQuery';

export const orderApi = createApi({
  reducerPath: 'orderApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Order'],
  endpoints: (builder) => ({
    getOrderById: builder.query({
      query: (orderId) => `/orders/${orderId}`,
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),
    createOrder: builder.mutation({
      query: (payload) => ({
        url: '/orders',
        method: 'POST',
        body: payload,
      }),
    }),
    listOrders: builder.query({
      queryFn: createUnavailableHandler('Order listing'),
    }),
    updateOrderStatus: builder.mutation({
      queryFn: createUnavailableHandler('Order status updates'),
    }),
  }),
});

export const {
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useListOrdersQuery,
  useUpdateOrderStatusMutation,
} = orderApi;

