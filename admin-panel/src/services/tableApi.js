import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQueryWithAuth } from "../app/baseQuery";
import { loadPersistedAuth } from "../utils/auth";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4001/api").replace(
  /\/$/,
  "",
);

function getStoredToken() {
  const auth = loadPersistedAuth();
  return auth?.token ?? auth?.accessToken ?? null;
}

export async function downloadTableQr(tableId, format = "png") {
  const token = getStoredToken();
  const response = await fetch(
    `${API_BASE_URL}/admin/tables/${tableId}/qr/download?format=${format}`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "X-Client-Type": "web",
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "QR download failed");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const fileName = match?.[1] || `table-${tableId}-qr.${format}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const tableApi = createApi({
  reducerPath: "tableApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Table", "TableSession"],
  endpoints: (builder) => ({
    listTables: builder.query({
      query: (params = {}) => ({
        url: "/admin/tables",
        params,
      }),
      providesTags: (result) => [
        "Table",
        ...(result?.items ?? []).map((table) => ({ type: "Table", id: table.id })),
      ],
    }),
    getTable: builder.query({
      query: (id) => `/admin/tables/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Table", id }],
    }),
    createTable: builder.mutation({
      query: (body) => ({
        url: "/admin/tables",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Table"],
    }),
    updateTable: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/admin/tables/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Table", id }, "Table"],
    }),
    deleteTable: builder.mutation({
      query: (id) => ({
        url: `/admin/tables/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Table"],
    }),
    generateTableQr: builder.mutation({
      query: (id) => ({
        url: `/admin/tables/${id}/qr/generate`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [{ type: "Table", id }, "Table"],
    }),
    regenerateTableQr: builder.mutation({
      query: (id) => ({
        url: `/admin/tables/${id}/qr/regenerate`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [{ type: "Table", id }, "Table"],
    }),
    listTableSessions: builder.query({
      query: (params = {}) => ({
        url: "/admin/table-sessions",
        params,
      }),
      providesTags: ["TableSession"],
    }),
    closeTableSession: builder.mutation({
      query: (id) => ({
        url: `/admin/table-sessions/${id}/close`,
        method: "POST",
      }),
      invalidatesTags: ["TableSession", "Table"],
    }),
  }),
});

export const {
  useListTablesQuery,
  useGetTableQuery,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
  useGenerateTableQrMutation,
  useRegenerateTableQrMutation,
  useListTableSessionsQuery,
  useCloseTableSessionMutation,
} = tableApi;
