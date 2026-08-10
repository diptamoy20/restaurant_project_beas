import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  restaurantId: null,
  restaurantSlug: null,
  restaurantName: null,
};

const kitchenSlice = createSlice({
  name: 'kitchen',
  initialState,
  reducers: {
    setSelectedRestaurant(state, action) {
      state.restaurantId = action.payload.id;
      state.restaurantSlug = action.payload.slug;
      state.restaurantName = action.payload.name;
    },
    clearSelectedRestaurant(state) {
      state.restaurantId = null;
      state.restaurantSlug = null;
      state.restaurantName = null;
    },
  },
});

export const { setSelectedRestaurant, clearSelectedRestaurant } = kitchenSlice.actions;
export default kitchenSlice.reducer;
