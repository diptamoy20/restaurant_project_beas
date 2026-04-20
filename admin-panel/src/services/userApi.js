import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQueryWithAuth, createUnavailableHandler } from '../app/baseQuery';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: baseQueryWithAuth,
  endpoints: (builder) => ({
    getUsers: builder.query({
      queryFn: createUnavailableHandler('User listing'),
    }),
    createUser: builder.mutation({
      queryFn: createUnavailableHandler('User creation'),
    }),
    updatePermissions: builder.mutation({
      queryFn: createUnavailableHandler('Permission assignment'),
    }),
  }),
});

export const { useGetUsersQuery, useCreateUserMutation, useUpdatePermissionsMutation } = userApi;

