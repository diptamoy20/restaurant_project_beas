import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../lib/api";

export const fetchMenu = createAsyncThunk(
  "menu/fetchMenu",
  async (restaurantId, { rejectWithValue }) => {
    try {
      let resolvedRestaurantId = restaurantId;

      if (!resolvedRestaurantId) {
        const restaurants = await api.get("/restaurants");
        resolvedRestaurantId = restaurants?.[0]?.id || "1";
      }

      const response = await api.get(
        `/menu/restaurant/${resolvedRestaurantId}`,
      );

      return {
        restaurantId: response?.restaurantId ?? resolvedRestaurantId,
        items: response?.items ?? [],
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
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenu.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenu.fulfilled, (state, action) => {
        state.loading = false;
        state.restaurantId = action.payload.restaurantId;
        state.items = action.payload.items;
      })
      .addCase(fetchMenu.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export default menuSlice.reducer;
