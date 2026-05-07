import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cartApi } from '../../services/cartApi';

const CART_STORAGE_KEY = 'cart_items';

export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await cartApi.getCart();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const addToCartAsync = createAsyncThunk(
  'cart/addToCartAsync',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await cartApi.addToCart(payload);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const updateCartItemAsync = createAsyncThunk(
  'cart/updateCartItemAsync',
  async ({ menuItemId, payload }, { rejectWithValue }) => {
    try {
      const response = await cartApi.updateCartItem(menuItemId, payload);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const removeFromCartAsync = createAsyncThunk(
  'cart/removeFromCartAsync',
  async (menuItemId, { rejectWithValue }) => {
    try {
      await cartApi.removeFromCart(menuItemId);
      return menuItemId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const clearCartAsync = createAsyncThunk(
  'cart/clearCartAsync',
  async (_, { rejectWithValue }) => {
    try {
      await cartApi.clearCart();
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Load cart from localStorage
const loadCartFromStorage = () => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save cart to localStorage
const saveCartToStorage = (items) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save cart to storage:', error);
  }
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: loadCartFromStorage(),
    lastOrderId: null,
    loading: false,
    error: null,
    syncing: false,
  },
  reducers: {
    addToCart(state, action) {
      const { item, quantity = 1 } = action.payload;
      const existingItem = state.items.find((cartItem) => cartItem.id === item.id);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({
          ...item,
          quantity,
        });
      }

      saveCartToStorage(state.items);
    },
    increaseQuantity(state, action) {
      const item = state.items.find((cartItem) => cartItem.id === action.payload);

      if (item) {
        item.quantity += 1;
        saveCartToStorage(state.items);
      }
    },
    decreaseQuantity(state, action) {
      const item = state.items.find((cartItem) => cartItem.id === action.payload);

      if (!item) {
        return;
      }

      item.quantity -= 1;
      state.items = state.items.filter((cartItem) => cartItem.quantity > 0);
      saveCartToStorage(state.items);
    },
    removeItem(state, action) {
      state.items = state.items.filter((cartItem) => cartItem.id !== action.payload);
      saveCartToStorage(state.items);
    },
    clearCart(state) {
      state.items = [];
      saveCartToStorage([]);
    },
    setLastOrderId(state, action) {
      state.lastOrderId = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Cart
      .addCase(fetchCart.pending, (state) => {
        state.syncing = true;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.syncing = false;
        // Merge server cart with local cart
        const serverItems = Array.isArray(action.payload) ? action.payload : [];
        state.items = serverItems;
        saveCartToStorage(state.items);
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.syncing = false;
        state.error = action.payload;
      })
      // Add to Cart
      .addCase(addToCartAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(addToCartAsync.fulfilled, (state, action) => {
        state.loading = false;
        const newItem = action.payload;
        const existingItem = state.items.find((item) => item.menuItemId === newItem.menuItemId);

        if (existingItem) {
          existingItem.quantity = newItem.quantity;
        } else {
          state.items.push(newItem);
        }

        saveCartToStorage(state.items);
      })
      .addCase(addToCartAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Cart Item
      .addCase(updateCartItemAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCartItemAsync.fulfilled, (state, action) => {
        state.loading = false;
        const updatedItem = action.payload;
        const item = state.items.find((i) => i.menuItemId === updatedItem.menuItemId);

        if (item) {
          item.quantity = updatedItem.quantity;
          item.price = updatedItem.price;
        }

        saveCartToStorage(state.items);
      })
      .addCase(updateCartItemAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Remove from Cart
      .addCase(removeFromCartAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeFromCartAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.menuItemId !== action.payload);
        saveCartToStorage(state.items);
      })
      .addCase(removeFromCartAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Clear Cart
      .addCase(clearCartAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(clearCartAsync.fulfilled, (state) => {
        state.loading = false;
        state.items = [];
        saveCartToStorage([]);
      })
      .addCase(clearCartAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  addToCart,
  increaseQuantity,
  decreaseQuantity,
  removeItem,
  clearCart,
  setLastOrderId,
  clearError,
} = cartSlice.actions;
export default cartSlice.reducer;
