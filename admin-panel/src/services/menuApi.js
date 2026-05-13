import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuth } from '../app/baseQuery';

export const menuApi = createApi({
  reducerPath: 'menuApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Menu', 'AdminMenu'],
  endpoints: (builder) => ({
    getMenuByRestaurant: builder.query({
      query: (restaurantId) => `/menu/restaurant/${restaurantId}`,
      providesTags: ['Menu'],
    }),
    getAdminRestaurantMenu: builder.query({
      query: (restaurantId) => `/admin/restaurants/${restaurantId}/menu`,
      providesTags: (_result, _error, restaurantId) => [{ type: 'AdminMenu', id: restaurantId }],
    }),
    createAdminMenuItem: builder.mutation({
      query: ({ restaurantId, body }) => ({
        url: `/admin/restaurants/${restaurantId}/menu`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'AdminMenu', id: restaurantId },
        'Menu',
      ],
    }),
    updateAdminMenuItem: builder.mutation({
      query: ({ id, body }) => ({
        url: `/admin/menu/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) =>
        restaurantId ? [{ type: 'AdminMenu', id: restaurantId }, 'Menu'] : ['Menu'],
    }),
    deleteAdminMenuItem: builder.mutation({
      query: ({ id }) => ({
        url: `/admin/menu/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { restaurantId }) =>
        restaurantId ? [{ type: 'AdminMenu', id: restaurantId }, 'Menu'] : ['Menu'],
    }),
    createCategory: builder.mutation({
      queryFn: async () => ({
        error: { status: 'CUSTOM_ERROR', error: 'Use menu item categoryName to auto-create categories.' },
      }),
    }),
    updateCategory: builder.mutation({
      queryFn: async () => ({
        error: { status: 'CUSTOM_ERROR', error: 'Category updates are not exposed yet.' },
      }),
    }),
    deleteCategory: builder.mutation({
      queryFn: async () => ({
        error: { status: 'CUSTOM_ERROR', error: 'Category deletion is not exposed yet.' },
      }),
    }),
  }),
});

export const {
  useGetMenuByRestaurantQuery,
  useGetAdminRestaurantMenuQuery,
  useCreateAdminMenuItemMutation,
  useUpdateAdminMenuItemMutation,
  useDeleteAdminMenuItemMutation,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = menuApi;
