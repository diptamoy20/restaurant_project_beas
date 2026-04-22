import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuth } from '../app/baseQuery';

export const orderApi = createApi({
  reducerPath: 'orderApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Order'],
  endpoints: (builder) => ({
    listOrders: builder.query({
      query: ({ limit = 25 } = {}) => `/orders?limit=${limit}`,
      providesTags: (result) => {
        const orders = Array.isArray(result) ? result : [];

        return [
          { type: 'Order', id: 'LIST' },
          ...orders.map((order) => ({ type: 'Order', id: order.id })),
        ];
      },
    }),
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
    updateOrderStatus: builder.mutation({
      query: ({ orderId, status }) => ({
        url: '/orders/update-order',
        method: 'POST',
        body: { orderId: Number(orderId), status },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: 'Order', id: Number(orderId) },
        { type: 'Order', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useListOrdersQuery,
  useUpdateOrderStatusMutation,
} = orderApi;

