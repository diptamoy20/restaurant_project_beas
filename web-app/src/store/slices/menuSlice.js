import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../lib/api';

export const fetchMenu = createAsyncThunk(
  'menu/fetchMenu',
  async (restaurantId) => {
    let resolvedRestaurantId = restaurantId;

    if (!resolvedRestaurantId) {
      const restaurants = await api.get('/restaurants');
      resolvedRestaurantId = restaurants?.[0]?.id;
    }

    if (!resolvedRestaurantId) {
      return {
        restaurantId: null,
        items: [],
      };
    }

    const response = await api.get(`/menu/restaurant/${resolvedRestaurantId}`);
    return {
      restaurantId: response?.restaurantId ?? resolvedRestaurantId,
      items: response?.items ?? [],
    };
  }
);

const menuSlice = createSlice({
  name: 'menu',
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
        state.error = action.error.message;
      });
  },
});

export default menuSlice.reducer;
