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
    updateUser: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/admin/staff/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['Staff'],
    }),
    uploadStaffProfileImage: builder.mutation({
      query: ({ id, file }) => {
        const body = new FormData();
        body.append('image', file);

        return {
          url: `/admin/staff/${id}/profile-image`,
          method: 'POST',
          body,
        };
      },
      invalidatesTags: ['Staff'],
    }),
    updatePassword: builder.mutation({
      query: ({ id, password }) => ({
        url: `/admin/staff/${id}/password`,
        method: 'PATCH',
        body: { password },
      }),
      invalidatesTags: ['Staff'],
    }),
    updateStatus: builder.mutation({
      query: ({ id, isActive }) => ({
        url: `/admin/staff/${id}/status`,
        method: 'PATCH',
        body: { isActive },
      }),
      invalidatesTags: ['Staff'],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/admin/staff/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Staff'],
    }),
  }),
});

export const {
  useDeleteUserMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdatePasswordMutation,
  useUpdatePermissionsMutation,
  useUpdateStatusMutation,
  useUpdateUserMutation,
  useUploadStaffProfileImageMutation,
} = userApi;
