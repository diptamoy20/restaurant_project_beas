import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuth } from '../app/baseQuery';

export const couponApi = createApi({
  reducerPath: 'couponApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Coupon'],
  endpoints: (builder) => ({
    listCoupons: builder.query({
      query: (params = {}) => ({
        url: '/admin/coupons',
        params,
      }),
      providesTags: ['Coupon'],
    }),
    createCoupon: builder.mutation({
      query: (body) => ({
        url: '/admin/coupons',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Coupon'],
    }),
    createCouponsBulk: builder.mutation({
      query: (body) => ({
        url: '/admin/coupons/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Coupon'],
    }),
    updateCoupon: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/admin/coupons/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Coupon'],
    }),
    deleteCoupon: builder.mutation({
      query: (id) => ({
        url: `/admin/coupons/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Coupon'],
    }),
  }),
});

export const {
  useListCouponsQuery,
  useCreateCouponMutation,
  useCreateCouponsBulkMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
} = couponApi;
