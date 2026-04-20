import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuth, createUnavailableHandler } from '../app/baseQuery';

export const menuApi = createApi({
  reducerPath: 'menuApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Menu'],
  endpoints: (builder) => ({
    getMenuByRestaurant: builder.query({
      query: (restaurantId) => `/menu/restaurant/${restaurantId}`,
      providesTags: ['Menu'],
    }),
    createCategory: builder.mutation({
      queryFn: createUnavailableHandler('Category creation'),
    }),
    updateCategory: builder.mutation({
      queryFn: createUnavailableHandler('Category updates'),
    }),
    deleteCategory: builder.mutation({
      queryFn: createUnavailableHandler('Category deletion'),
    }),
    createMenuItem: builder.mutation({
      queryFn: createUnavailableHandler('Menu item creation'),
    }),
    updateMenuItem: builder.mutation({
      queryFn: createUnavailableHandler('Menu item updates'),
    }),
    deleteMenuItem: builder.mutation({
      queryFn: createUnavailableHandler('Menu item deletion'),
    }),
  }),
});

export const {
  useGetMenuByRestaurantQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
} = menuApi;

