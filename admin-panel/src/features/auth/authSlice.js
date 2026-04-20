import { createSlice } from '@reduxjs/toolkit';

import {
  clearPersistedAuth,
  inferUiRole,
  loadPersistedAuth,
  normalizePermissions,
} from '../../utils/auth';

const persistedAuth = loadPersistedAuth();

const initialState = {
  user: persistedAuth?.user ?? null,
  token: persistedAuth?.token ?? null,
  role: persistedAuth?.role ?? null,
  permissions: persistedAuth?.permissions ?? {},
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const role = action.payload.role ?? inferUiRole(action.payload.user?.roles);
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.role = role;
      state.permissions = normalizePermissions(action.payload.permissions, role);
    },
    hydrateProfile: (state, action) => {
      const role = inferUiRole(action.payload.roles);
      state.user = { ...state.user, ...action.payload };
      state.role = role;
      state.permissions = normalizePermissions(action.payload.permissions, role);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.role = null;
      state.permissions = {};
      clearPersistedAuth();
    },
  },
});

export const { setCredentials, hydrateProfile, logout } = authSlice.actions;
export default authSlice.reducer;

