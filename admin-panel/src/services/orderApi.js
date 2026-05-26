import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQueryWithAuth } from "../app/baseQuery";

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Order"],
  endpoints: (builder) => ({
    getOrderById: builder.query({
      query: (orderId) => `/orders/${orderId}`,
      providesTags: (_result, _error, id) => [{ type: "Order", id }],
    }),
    listOrders: builder.query({
      query: (params = {}) => ({
        url: "/admin/orders",
        params,
      }),
      providesTags: (result) => [
        "Order",
        ...(result?.items ?? []).map((order) => ({
          type: "Order",
          id: order.id,
        })),
      ],
    }),
    createOrder: builder.mutation({
      query: (payload) => ({
        url: "/orders",
        method: "POST",
        body: payload,
      }),
    }),
    acceptOrder: builder.mutation({
      query: (orderId) => ({
        url: `/admin/orders/${orderId}/accept`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, orderId) => [
        { type: "Order", id: orderId },
      ],
    }),
    updateOrderStatus: builder.mutation({
      query: ({ orderId, status }) => ({
        url: `/admin/orders/${orderId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: "Order", id: orderId },
      ],
    }),
    listDeliveryAgents: builder.query({
      query: () => "/admin/orders/delivery-agents",
    }),
    assignDeliveryAgent: builder.mutation({
      query: ({ orderId, agentId }) => ({
        url: `/admin/orders/${orderId}/delivery`,
        method: "PATCH",
        body: { agentId },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: "Order", id: orderId },
        "Order",
      ],
    }),
  }),
});

export const {
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useListOrdersQuery,
  useUpdateOrderStatusMutation,
  useAcceptOrderMutation,
  useListDeliveryAgentsQuery,
  useAssignDeliveryAgentMutation,
} = orderApi;
