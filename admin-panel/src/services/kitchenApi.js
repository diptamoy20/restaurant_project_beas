import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from '../app/baseQuery';

export const kitchenApi = createApi({
  reducerPath: 'kitchenApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'KitchenDashboard',
    'KitchenInventory',
    'KitchenTransfers',
    'ConsumptionHistory',
    'InventoryLedger',
  ],
  endpoints: (builder) => ({
    getInventoryDashboard: builder.query({
      query: (restaurantId) =>
        restaurantId ? `/inventory/dashboard?restaurantId=${restaurantId}` : '/inventory/dashboard',
      providesTags: ['KitchenDashboard'],
    }),

    getKitchenInventory: builder.query({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.restaurantId) queryParams.append('restaurantId', params.restaurantId);
        if (params?.search) queryParams.append('search', params.search);
        if (params?.status) queryParams.append('status', params.status);
        const q = queryParams.toString();
        return `/inventory/kitchen${q ? `?${q}` : ''}`;
      },
      providesTags: ['KitchenInventory'],
    }),

    getKitchenTransfers: builder.query({
      query: (restaurantId) =>
        restaurantId ? `/inventory/transfers?restaurantId=${restaurantId}` : '/inventory/transfers',
      providesTags: ['KitchenTransfers'],
    }),

    createKitchenTransfer: builder.mutation({
      query: (body) => ({
        url: '/inventory/transfers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['KitchenTransfers', 'KitchenDashboard'],
    }),

    approveKitchenTransfer: builder.mutation({
      query: (id) => ({
        url: `/inventory/transfers/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: [
        'KitchenTransfers',
        'KitchenInventory',
        'KitchenDashboard',
        'InventoryLedger',
      ],
    }),

    getConsumptionHistory: builder.query({
      query: (restaurantId) =>
        restaurantId ? `/inventory/consumption?restaurantId=${restaurantId}` : '/inventory/consumption',
      providesTags: ['ConsumptionHistory'],
    }),

    getTransactionLedger: builder.query({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.restaurantId) queryParams.append('restaurantId', params.restaurantId);
        if (params?.inventoryType) queryParams.append('inventoryType', params.inventoryType);
        const q = queryParams.toString();
        return `/inventory/ledger${q ? `?${q}` : ''}`;
      },
      providesTags: ['InventoryLedger'],
    }),

    getKitchenDisplayOrders: builder.query({
      query: (restaurantId) =>
        restaurantId ? `/inventory/kitchen-display?restaurantId=${restaurantId}` : '/inventory/kitchen-display',
      providesTags: ['KitchenDashboard'],
    }),
  }),
});

export const {
  useGetInventoryDashboardQuery,
  useGetKitchenInventoryQuery,
  useGetKitchenTransfersQuery,
  useCreateKitchenTransferMutation,
  useApproveKitchenTransferMutation,
  useGetConsumptionHistoryQuery,
  useGetTransactionLedgerQuery,
  useGetKitchenDisplayOrdersQuery,
} = kitchenApi;
