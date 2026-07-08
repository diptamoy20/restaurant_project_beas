import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../lib/api";
import {
  getRestaurantMenuBySlug,
  getRestaurantMenuWithLocation,
} from "../../services/locationApi";

export const fetchMenu = createAsyncThunk(
  "menu/fetchMenu",
  async (payload, { rejectWithValue, signal }) => {
    try {
      const restaurantId =
        typeof payload === "object" && payload !== null
          ? payload.restaurantId
          : payload;
      const restaurantSlug =
        typeof payload === "object" && payload !== null
          ? payload.restaurantSlug
          : null;
      const coordinates =
        typeof payload === "object" && payload !== null
          ? payload.coordinates
          : null;

      if (!restaurantSlug && !restaurantId) {
        return rejectWithValue("Restaurant is required to load the menu.");
      }

      const response = restaurantSlug
        ? coordinates
          ? await getRestaurantMenuBySlug({
              slug: restaurantSlug,
              lat: coordinates.lat,
              lng: coordinates.lng,
              limit: 50,
              signal,
            })
          : await api.get(
              `/menu/restaurant/slug/${encodeURIComponent(restaurantSlug)}?limit=50`,
              { signal },
            )
        : coordinates
          ? await getRestaurantMenuWithLocation({
              restaurantId,
              lat: coordinates.lat,
              lng: coordinates.lng,
              limit: 50,
              signal,
            })
          : await api.get(`/menu/restaurant/${restaurantId}?limit=50`, {
              signal,
            });

      return {
        restaurantId: response?.restaurantId ?? restaurantId ?? null,
        restaurantSlug: response?.restaurant?.slug ?? restaurantSlug ?? null,
        items: response?.items ?? [],
        categories: response?.categories ?? [],
        restaurant: response?.restaurant ?? null,
        delivery: response?.delivery ?? null,
        deliveryAvailable: response?.deliveryAvailable,
        distanceKm: response?.distanceKm,
        estimatedDeliveryTimeMinutes: response?.estimatedDeliveryTimeMinutes,
        deliveryFee: response?.deliveryFee,
      };
    } catch (error) {
      return rejectWithValue(
        error.sessionExpired
          ? "Session expired. Please login again."
          : error.message,
      );
    }
  },
);

const menuSlice = createSlice({
  name: "menu",
  initialState: {
    restaurantId: null,
    restaurantSlug: null,
    items: [],
    categories: [],
    restaurant: null,
    delivery: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenu.pending, (state, action) => {
        state.loading = true;
        state.error = null;

        const nextId =
          typeof action.meta.arg === "object" && action.meta.arg !== null
            ? action.meta.arg.restaurantId
            : action.meta.arg;
        const nextSlug =
          typeof action.meta.arg === "object" && action.meta.arg !== null
            ? action.meta.arg.restaurantSlug
            : null;

        if (
          (nextId != null && Number(state.restaurantId) !== Number(nextId)) ||
          (nextSlug && state.restaurantSlug && state.restaurantSlug !== nextSlug)
        ) {
          state.restaurantId = null;
          state.restaurantSlug = null;
          state.items = [];
          state.categories = [];
          state.restaurant = null;
          state.delivery = null;
        }
      })
      .addCase(fetchMenu.fulfilled, (state, action) => {
        state.loading = false;
        state.restaurantId = action.payload.restaurantId;
        state.restaurantSlug =
          action.payload.restaurantSlug ??
          action.payload.restaurant?.slug ??
          state.restaurantSlug;
        state.items = action.payload.items;
        state.categories = action.payload.categories ?? [];
        state.restaurant = action.payload.restaurant ?? null;
        state.delivery = action.payload.delivery;
      })
      .addCase(fetchMenu.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export default menuSlice.reducer;
