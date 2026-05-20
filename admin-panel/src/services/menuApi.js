import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuth } from '../app/baseQuery';

export const menuApi = createApi({
  reducerPath: 'menuApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Menu', 'AdminMenu', 'Category'],
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
        { type: 'Category', id: restaurantId },
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
        restaurantId
          ? [{ type: 'AdminMenu', id: restaurantId }, { type: 'Category', id: restaurantId }, 'Menu']
          : ['Menu'],
    }),
    deleteAdminMenuItem: builder.mutation({
      query: ({ id }) => ({
        url: `/admin/menu/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { restaurantId }) =>
        restaurantId
          ? [{ type: 'AdminMenu', id: restaurantId }, { type: 'Category', id: restaurantId }, 'Menu']
          : ['Menu'],
    }),
    getRestaurantCategories: builder.query({
      query: (restaurantId) => `/admin/restaurants/${restaurantId}/categories`,
      providesTags: (_result, _error, restaurantId) => [{ type: 'Category', id: restaurantId }],
    }),
    createCategory: builder.mutation({
      query: ({ restaurantId, body }) => ({
        url: `/admin/restaurants/${restaurantId}/categories`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'Category', id: restaurantId },
        { type: 'AdminMenu', id: restaurantId },
        'Menu',
      ],
    }),
    updateCategory: builder.mutation({
      query: ({ id, body }) => ({
        url: `/admin/categories/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'Category', id: restaurantId },
        { type: 'AdminMenu', id: restaurantId },
        'Menu',
      ],
    }),
    deleteCategory: builder.mutation({
      query: ({ id }) => ({
        url: `/admin/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'Category', id: restaurantId },
        { type: 'AdminMenu', id: restaurantId },
        'Menu',
      ],
    }),
  }),
});

export const {
  useGetMenuByRestaurantQuery,
  useGetAdminRestaurantMenuQuery,
  useCreateAdminMenuItemMutation,
  useUpdateAdminMenuItemMutation,
  useDeleteAdminMenuItemMutation,
  useGetRestaurantCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = menuApi;
