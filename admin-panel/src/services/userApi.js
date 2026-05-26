import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuth } from '../app/baseQuery';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Staff'],
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => '/admin/staff',
      providesTags: ['Staff'],
    }),
    createUser: builder.mutation({
      query: (payload) => ({
        url: '/admin/staff',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Staff'],
    }),
    updatePermissions: builder.mutation({
      query: ({ id, email, permissions }) => ({
        url: `/admin/staff/${id}/permissions`,
        method: 'PATCH',
        body: { email, permissions },
      }),
      invalidatesTags: ['Staff'],
    }),
  }),
});

export const { useGetUsersQuery, useCreateUserMutation, useUpdatePermissionsMutation } = userApi;
