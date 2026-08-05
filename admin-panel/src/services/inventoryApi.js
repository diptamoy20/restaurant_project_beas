import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuth } from '../app/baseQuery';

export const inventoryApi = createApi({
  reducerPath: 'inventoryApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'InventoryDashboard',
    'StoreInventory',
    'KitchenInventory',
    'Recipes',
    'KitchenTransfers',
    'ConsumptionHistory',
    'InventoryLedger',
    'Requisitions',
  ],
  endpoints: (builder) => ({
    getInventoryDashboard: builder.query({
      query: (restaurantId) =>
        restaurantId ? `/inventory/dashboard?restaurantId=${restaurantId}` : '/inventory/dashboard',
      providesTags: ['InventoryDashboard'],
    }),

    getStoreInventory: builder.query({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.restaurantId) queryParams.append('restaurantId', params.restaurantId);
        if (params?.search) queryParams.append('search', params.search);
        if (params?.category) queryParams.append('category', params.category);
        if (params?.status) queryParams.append('status', params.status);
        const q = queryParams.toString();
        return `/inventory/store${q ? `?${q}` : ''}`;
      },
      providesTags: ['StoreInventory'],
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

    createInventoryItem: builder.mutation({
      query: (body) => ({
        url: '/inventory/items',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['StoreInventory', 'KitchenInventory', 'InventoryDashboard', 'Recipes'],
    }),

    getRecipes: builder.query({
      query: (restaurantId) =>
        restaurantId ? `/inventory/recipes?restaurantId=${restaurantId}` : '/inventory/recipes',
      providesTags: ['Recipes'],
    }),

    createOrUpdateRecipe: builder.mutation({
      query: (body) => ({
        url: '/inventory/recipes',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Recipes', 'InventoryDashboard'],
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
      invalidatesTags: ['KitchenTransfers', 'InventoryDashboard'],
    }),

    approveKitchenTransfer: builder.mutation({
      query: (id) => ({
        url: `/inventory/transfers/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: [
        'KitchenTransfers',
        'StoreInventory',
        'KitchenInventory',
        'InventoryDashboard',
        'InventoryLedger',
        'Requisitions',
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

    getRequisitions: builder.query({
      query: (restaurantId) =>
        restaurantId ? `/inventory/requisitions?restaurantId=${restaurantId}` : '/inventory/requisitions',
      providesTags: ['Requisitions'],
    }),

    createRequisition: builder.mutation({
      query: (body) => ({
        url: '/inventory/requisitions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Requisitions', 'InventoryDashboard'],
    }),

    seedInventoryData: builder.mutation({
      query: () => ({
        url: '/inventory/seed',
        method: 'POST',
      }),
      invalidatesTags: [
        'InventoryDashboard',
        'StoreInventory',
        'KitchenInventory',
        'Recipes',
        'KitchenTransfers',
        'Requisitions',
      ],
    }),
  }),
});

export const {
  useGetInventoryDashboardQuery,
  useGetStoreInventoryQuery,
  useGetKitchenInventoryQuery,
  useCreateInventoryItemMutation,
  useGetRecipesQuery,
  useCreateOrUpdateRecipeMutation,
  useGetKitchenTransfersQuery,
  useCreateKitchenTransferMutation,
  useApproveKitchenTransferMutation,
  useGetConsumptionHistoryQuery,
  useGetTransactionLedgerQuery,
  useGetRequisitionsQuery,
  useCreateRequisitionMutation,
  useSeedInventoryDataMutation,
} = inventoryApi;
