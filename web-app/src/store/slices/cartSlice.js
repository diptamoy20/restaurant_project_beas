import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    lastOrderId: null,
  },
  reducers: {
    addToCart(state, action) {
      const { item, quantity = 1 } = action.payload;
      const existingItem = state.items.find((cartItem) => cartItem.id === item.id);

      if (existingItem) {
        existingItem.quantity += quantity;
        return;
      }

      state.items.push({
        ...item,
        quantity,
      });
    },
    increaseQuantity(state, action) {
      const item = state.items.find((cartItem) => cartItem.id === action.payload);

      if (item) {
        item.quantity += 1;
      }
    },
    decreaseQuantity(state, action) {
      const item = state.items.find((cartItem) => cartItem.id === action.payload);

      if (!item) {
        return;
      }

      item.quantity -= 1;
      state.items = state.items.filter((cartItem) => cartItem.quantity > 0);
    },
    removeItem(state, action) {
      state.items = state.items.filter((cartItem) => cartItem.id !== action.payload);
    },
    clearCart(state) {
      state.items = [];
    },
    setLastOrderId(state, action) {
      state.lastOrderId = action.payload;
    },
  },
});

export const {
  addToCart,
  increaseQuantity,
  decreaseQuantity,
  removeItem,
  clearCart,
  setLastOrderId,
} = cartSlice.actions;
export default cartSlice.reducer;
