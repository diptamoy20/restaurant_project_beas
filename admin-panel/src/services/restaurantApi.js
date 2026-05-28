import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQueryWithAuth } from "../app/baseQuery";

export const restaurantApi = createApi({
  reducerPath: "restaurantApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Restaurant"],
  endpoints: (builder) => ({
    /**
     * Get all restaurants (including inactive) for admin
     */
    getAllRestaurants: builder.query({
      query: () => "/restaurants/admin/all?limit=50",
      transformResponse: (response) =>
        Array.isArray(response) ? response : (response?.items ?? []),
      providesTags: ["Restaurant"],
    }),

    /**
     * Create a new restaurant
     */
    createRestaurant: builder.mutation({
      query: (data) => ({
        url: "/restaurants",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Restaurant"],
    }),

    /**
     * Update an existing restaurant
     */
    updateRestaurant: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/restaurants/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Restaurant"],
    }),

    uploadRestaurantImage: builder.mutation({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append("image", file);

        return {
          url: `/restaurants/${id}/image`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Restaurant"],
    }),

    /**
     * Delete a restaurant
     */
    deleteRestaurant: builder.mutation({
      query: (id) => ({
        url: `/restaurants/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Restaurant"],
    }),

    /**
     * Get single restaurant details
     */
    getRestaurant: builder.query({
      query: (id) => `/restaurants/${id}`,
      providesTags: (result, error, id) => [{ type: "Restaurant", id }],
    }),
  }),
});

export const {
  useGetAllRestaurantsQuery,
  useCreateRestaurantMutation,
  useUpdateRestaurantMutation,
  useUploadRestaurantImageMutation,
  useDeleteRestaurantMutation,
  useGetRestaurantQuery,
} = restaurantApi;
