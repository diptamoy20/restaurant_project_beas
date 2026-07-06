import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQueryWithAuth } from "../app/baseQuery";
import { getApiBaseUrl } from "../config/env";
import { loadPersistedAuth } from "../utils/auth";

const API_BASE_URL = getApiBaseUrl();

function getStoredToken() {
  const auth = loadPersistedAuth();
  return auth?.token ?? auth?.accessToken ?? null;
}

export async function downloadOrderInvoice(orderId) {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/invoice/download`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Client-Type": "web",
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Invoice download failed");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const fileName = match?.[1] || `invoice-${orderId}.pdf`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Order"],
  endpoints: (builder) => ({
    getOrderById: builder.query({
      query: (orderId) => `/orders/${orderId}`,
      providesTags: (_result, _error, id) => [{ type: "Order", id }],
    }),
    getOrderInvoice: builder.query({
      query: (orderId) => `/orders/${orderId}/invoice`,
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
      query: ({ orderId, status, cancellationReason }) => ({
        url: `/admin/orders/${orderId}/status`,
        method: "PATCH",
        body: { status, cancellationReason },
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
      // Only invalidate the specific order — the mutation response already
      // returns the updated order so the detail view refreshes via cache.
      // Invalidating the broad "Order" list tag caused the whole order list
      // to refetch on every assignment, doubling up with the socket event.
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: "Order", id: orderId },
      ],
    }),
  }),
});

export const {
  useGetOrderByIdQuery,
  useGetOrderInvoiceQuery,
  useCreateOrderMutation,
  useListOrdersQuery,
  useUpdateOrderStatusMutation,
  useAcceptOrderMutation,
  useListDeliveryAgentsQuery,
  useAssignDeliveryAgentMutation,
} = orderApi;
