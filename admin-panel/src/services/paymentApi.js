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
  }),
});

export const { useInitiatePaymentMutation, useGetPaymentHistoryQuery } = paymentApi;

