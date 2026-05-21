import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { signInWithPopup } from "firebase/auth";
import { api } from "../../lib/api";
import {
  facebookProvider,
  getFirebaseAuth,
  googleProvider,
} from "../../lib/firebase";
import {
  clearStoredUser,
  loadUserFromStorage,
  saveUserToStorage,
  updateStoredUser,
} from "../../services/authStorage";

function getInitialState() {
  const storedAuth = loadUserFromStorage();

  return {
    user: storedAuth?.user ?? null,
    token: storedAuth?.token ?? null,
    refreshToken: storedAuth?.refreshToken ?? null,
    refreshTokenExpiresAt: storedAuth?.refreshTokenExpiresAt ?? null,
    loading: false,
    error: null,
    message: null,
  };
}

function normalizeAuthResponse(data) {
  const token = data?.token ?? data?.accessToken;

  if (!token || !data?.user) {
    throw new Error("Invalid auth response");
  }

  return {
    user: data.user,
    token,
    refreshToken: data.refreshToken,
    refreshTokenExpiresAt: data.refreshTokenExpiresAt ?? null,
  };
}

function getSocialLoginErrorMessage(error, providerLabel) {
  const code = error?.code;

  if (error?.message === "firebase-not-configured") {
    return `${providerLabel} sign-in is not configured yet.`;
  }

  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  ) {
    return `${providerLabel} sign-in was cancelled.`;
  }

  if (code === "auth/popup-blocked") {
    return "Popup was blocked. Allow popups and try again.";
  }

  if (code === "auth/network-request-failed") {
    return `Network issue during ${providerLabel} sign-in. Please try again.`;
  }

  return `Unable to sign in with ${providerLabel}. Please try again.`;
}

async function signInWithFirebaseProvider({
  provider,
  socialProvider,
  rememberMe,
}) {
  const auth = getFirebaseAuth();
  const result = await signInWithPopup(auth, socialProvider);
  const idToken = await result.user.getIdToken();
  const response = await api.post(
    "/auth/social-login",
    {
      provider,
      idToken,
    },
    {
      skipUnauthorizedHandler: true,
    },
  );

  return {
    ...normalizeAuthResponse(response?.data ?? response),
    rememberMe,
  };
}

export const loginCustomer = createAsyncThunk(
  "auth/loginCustomer",
  async (payload, { rejectWithValue }) => {
    try {
      const { rememberMe = true, ...credentials } = payload;
      const response = await api.post("/auth/login", credentials);

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
  "auth/registerCustomer",
  async (payload, { rejectWithValue }) => {
    try {
      const { rememberMe = true, confirmPassword, ...registration } = payload;
      const response = await api.post("/auth/register", registration);

      return {
        ...normalizeAuthResponse(response?.data ?? response),
        rememberMe,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const loginWithFirebaseGoogle = createAsyncThunk(
  "auth/loginWithFirebaseGoogle",
  async ({ rememberMe = true } = {}, { rejectWithValue }) => {
    try {
      return await signInWithFirebaseProvider({
        provider: "firebase_google",
        socialProvider: googleProvider,
        rememberMe,
      });
    } catch (error) {
      return rejectWithValue(getSocialLoginErrorMessage(error, "Google"));
    }
  },
);

export const loginWithFirebaseFacebook = createAsyncThunk(
  "auth/loginWithFirebaseFacebook",
  async ({ rememberMe = true } = {}, { rejectWithValue }) => {
    try {
      return await signInWithFirebaseProvider({
        provider: "firebase_facebook",
        socialProvider: facebookProvider,
        rememberMe,
      });
    } catch (error) {
      return rejectWithValue(getSocialLoginErrorMessage(error, "Facebook"));
    }
  },
);

export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/forgot-password", payload);

      return (
        response?.message ??
        "If an account exists, password reset instructions have been sent."
      );
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/reset-password", payload);

      return (
        response?.message ?? "Password reset successful. You can sign in now."
      );
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const refreshSession = createAsyncThunk(
  "auth/refreshSession",
  async (_, { getState, rejectWithValue }) => {
    try {
      const refreshToken = getState().auth?.refreshToken;
      const refreshTokenExpiresAt = getState().auth?.refreshTokenExpiresAt;

      if (!refreshToken) {
        return rejectWithValue("Session expired. Please login again.");
      }

      if (
        refreshTokenExpiresAt &&
        Date.parse(refreshTokenExpiresAt) <= Date.now()
      ) {
        return rejectWithValue("Session expired. Please login again.");
      }

      const response = await api.post(
        "/auth/refresh",
        { refreshToken },
        {
          skipAuthRefresh: true,
          skipUnauthorizedHandler: true,
        },
      );

      return normalizeAuthResponse(response?.data ?? response);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.patch("/auth/me", payload);

      return response?.data ?? response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const uploadProfileImage = createAsyncThunk(
  "auth/uploadProfileImage",
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await api.request("/auth/me/profile-image", {
        method: "POST",
        body: formData,
      });

      return response?.data ?? response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState: getInitialState(),
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.refreshTokenExpiresAt = null;
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
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.refreshTokenExpiresAt = null;
        clearStoredUser();
      })
      .addCase(loginCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.refreshTokenExpiresAt = action.payload.refreshTokenExpiresAt;
        saveUserToStorage(state, action.payload.rememberMe);
      })
      .addCase(loginCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Login failed";
      })
      .addCase(registerCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.refreshTokenExpiresAt = null;
        clearStoredUser();
      })
      .addCase(registerCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.refreshTokenExpiresAt = action.payload.refreshTokenExpiresAt;
        saveUserToStorage(state, action.payload.rememberMe);
      })
      .addCase(registerCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Registration failed";
      })
      .addCase(loginWithFirebaseGoogle.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.refreshTokenExpiresAt = null;
        clearStoredUser();
      })
      .addCase(loginWithFirebaseGoogle.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.refreshTokenExpiresAt = action.payload.refreshTokenExpiresAt;
        saveUserToStorage(state, action.payload.rememberMe);
      })
      .addCase(loginWithFirebaseGoogle.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Unable to sign in with Google. Please try again.";
      })
      .addCase(loginWithFirebaseFacebook.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.refreshTokenExpiresAt = null;
        clearStoredUser();
      })
      .addCase(loginWithFirebaseFacebook.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.refreshTokenExpiresAt = action.payload.refreshTokenExpiresAt;
        saveUserToStorage(state, action.payload.rememberMe);
      })
      .addCase(loginWithFirebaseFacebook.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload ||
          "Unable to sign in with Facebook. Please try again.";
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
        state.error = action.payload || "Unable to send reset instructions";
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
        state.error = action.payload || "Unable to reset password";
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.refreshTokenExpiresAt = action.payload.refreshTokenExpiresAt;
        updateStoredUser(state);
      })
      .addCase(refreshSession.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.refreshTokenExpiresAt = null;
        clearStoredUser();
      })
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.message = "Profile updated";
        updateStoredUser(state);
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Unable to update profile";
      })
      .addCase(uploadProfileImage.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(uploadProfileImage.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.message = "Profile image updated";
        updateStoredUser(state);
      })
      .addCase(uploadProfileImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Unable to upload profile image";
      });
  },
});

export const { clearAuthFeedback, logout } = authSlice.actions;
export default authSlice.reducer;
