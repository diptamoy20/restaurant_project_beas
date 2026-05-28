import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuth, createUnavailableHandler } from '../app/baseQuery';

export const paymentApi = createApi({
  reducerPath: 'paymentApi',
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    initiatePayment: builder.mutation({
      query: (payload) => ({
        url: '/payments/initiate',
        method: 'POST',
        body: payload,
      }),
    }),
    getPaymentHistory: builder.query({
      queryFn: createUnavailableHandler('Payment history'),
    }),
    confirmCodPaymentByAdmin: builder.mutation({
      query: (orderId) => ({
        url: '/payments/cod/admin-confirm',
        method: 'POST',
        body: { orderId },
      }),
    }),
  }),
});

export const {
  useInitiatePaymentMutation,
  useGetPaymentHistoryQuery,
  useConfirmCodPaymentByAdminMutation,
} = paymentApi;

