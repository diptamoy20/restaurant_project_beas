import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../../lib/api';

const AUTH_STORAGE_KEY = 'restaurant-admin-auth';

function loadPersistedAuth() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return {
      user: null,
      token: null,
      selectedRole: null,
      loading: false,
      error: null,
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      user: parsed.user ?? null,
      token: parsed.token ?? null,
      selectedRole: parsed.selectedRole ?? null,
      loading: false,
      error: null,
    };
  } catch {
    return {
      user: null,
      token: null,
      selectedRole: null,
      loading: false,
      error: null,
    };
  }
}

function persistAuthState(state) {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      user: state.user,
      token: state.token,
      selectedRole: state.selectedRole,
    }),
  );
}

export const loginAdminUser = createAsyncThunk(
  'auth/loginAdminUser',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await api.post('/auth/login/role', {
        email: payload.email,
        password: payload.password,
        role: payload.role,
      });

      return {
        user: data.user,
        token: data.accessToken,
        selectedRole: payload.role,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState: loadPersistedAuth(),
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.selectedRole = null;
      state.error = null;
      localStorage.removeItem(AUTH_STORAGE_KEY);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAdminUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAdminUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.selectedRole = action.payload.selectedRole;
        persistAuthState(state);
      })
      .addCase(loginAdminUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
