import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { logout } from "../features/auth/authSlice";
import { loadPersistedAuth } from "../utils/auth";

function getAuthToken(state) {
  if (state.auth.token) {
    return state.auth.token;
  }

  const persistedAuth = loadPersistedAuth();
  return persistedAuth?.token ?? persistedAuth?.accessToken ?? null;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:4001/api"
  ).replace(/\/$/, ""),
  prepareHeaders: (headers, { arg, getState }) => {
    const token = getAuthToken(getState());

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    if (!(typeof FormData !== "undefined" && arg?.body instanceof FormData)) {
      headers.set("content-type", "application/json");
    }
    headers.set("x-client-type", "web");
    return headers;
  },
});

export async function baseQueryWithAuth(args, api, extraOptions) {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    api.dispatch(logout());
  }

  if (
    result.data &&
    typeof result.data === "object" &&
    result.data.success === true &&
    "data" in result.data
  ) {
    return {
      ...result,
      data: result.data.data,
    };
  }

  return result;
}

export function createUnavailableHandler(feature) {
  return async () => ({
    error: {
      status: "CUSTOM_ERROR",
      error: `${feature} is not exposed by the current backend API.`,
    },
  });
}
