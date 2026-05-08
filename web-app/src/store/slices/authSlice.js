import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../../lib/api';
import { clearStoredUser, loadUserFromStorage, saveUserToStorage } from '../../services/authStorage';

function getInitialState() {
  const storedAuth = loadUserFromStorage();

  return {
    user: storedAuth?.user ?? null,
    token: storedAuth?.token ?? null,
    loading: false,
    error: null,
    message: null,
  };
}

function normalizeAuthResponse(data) {
  const token = data?.token ?? data?.accessToken;

  if (!token || !data?.user) {
    throw new Error('Invalid auth response');
  }

  return {
    user: data.user,
    token,
    refreshToken: data.refreshToken,
  };
}

export const loginCustomer = createAsyncThunk(
  'auth/loginCustomer',
  async (payload, { rejectWithValue }) => {
    try {
      const { rememberMe = true, ...credentials } = payload;
      const response = await api.post('/auth/login', credentials);

      return {
        ...normalizeAuthResponse(response?.data ?? response),
        rememberMe,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const registerCustomer = createAsyncThunk(
  'auth/registerCustomer',
  async (payload, { rejectWithValue }) => {
    try {
      const { rememberMe = true, confirmPassword, ...registration } = payload;
      const response = await api.post('/auth/register', registration);

      return {
        ...normalizeAuthResponse(response?.data ?? response),
        rememberMe,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/forgot-password', payload);

      return response?.message ?? 'If an account exists, password reset instructions have been sent.';
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/reset-password', payload);

      return response?.message ?? 'Password reset successful. You can sign in now.';
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.error = null;
      state.message = null;
      clearStoredUser();
    },
    clearAuthFeedback(state) {
      state.error = null;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(loginCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        saveUserToStorage(state, action.payload.rememberMe);
      })
      .addCase(loginCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
      })
      .addCase(registerCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(registerCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        saveUserToStorage(state, action.payload.rememberMe);
      })
      .addCase(registerCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Registration failed';
      })
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Unable to send reset instructions';
      })
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Unable to reset password';
      });
  },
});

export const { clearAuthFeedback, logout } = authSlice.actions;
export default authSlice.reducer;
