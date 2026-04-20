import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuth } from '../app/baseQuery';

export const customerApi = createApi({
  reducerPath: 'customerApi',
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    getMembershipByUserId: builder.query({
      query: (userId) => `/membership/user/${userId}`,
    }),
  }),
});

export const { useGetMembershipByUserIdQuery } = customerApi;

