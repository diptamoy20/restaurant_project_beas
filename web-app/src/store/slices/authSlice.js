import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../../lib/api';

const AUTH_STORAGE_KEY = 'restaurant-web-auth';

function loadPersistedAuth() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return {
      user: null,
      token: null,
      loading: false,
      error: null,
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      user: parsed.user ?? null,
      token: parsed.token ?? null,
      loading: false,
      error: null,
    };
  } catch {
    return {
      user: null,
      token: null,
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
    }),
  );
}

export const loginCustomer = createAsyncThunk(
  'auth/loginCustomer',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', payload);
      const data = response?.data ?? response;

      if (!data?.accessToken || !data?.user) {
        return rejectWithValue('Invalid login response');
      }

      return {
        user: data.user,
        token: data.accessToken,
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
      state.error = null;
      localStorage.removeItem(AUTH_STORAGE_KEY);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        persistAuthState(state);
      })
      .addCase(loginCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
