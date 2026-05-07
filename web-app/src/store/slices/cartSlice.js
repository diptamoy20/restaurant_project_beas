import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cartApi } from '../../services/cartApi';

const CART_STORAGE_KEY = 'cart_items';

function getCartKey(item) {
  const menuItemId = item.menuItemId ?? item.id;
  const variantId = item.variantId ?? 'base';
  return `${menuItemId}:${variantId}`;
}

function normalizeCartItem(item) {
  const menuItem = item.menuItem ?? item;
  const menuItemId = item.menuItemId ?? menuItem.id ?? item.id;
  const variantId = item.variantId ?? null;

  return {
    ...item,
    id: menuItemId,
    cartItemId: item.menuItem ? item.id : item.cartItemId,
    menuItemId,
    variantId,
    name: menuItem.name ?? item.name ?? 'Menu item',
    category: menuItem.category ?? item.category,
    restaurantId: menuItem.restaurantId ?? item.restaurantId,
    price: Number(item.price ?? item.variant?.price ?? menuItem.price ?? 0),
    quantity: Number(item.quantity ?? 1),
    menuItem,
    variant: item.variant ?? null,
  };
}

function matchesCartItem(item, itemId) {
  return item.id === itemId || item.menuItemId === itemId || getCartKey(item) === itemId;
}

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
    return stored ? JSON.parse(stored).map(normalizeCartItem) : [];
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
      const normalizedItem = normalizeCartItem({ ...item, quantity });
      const existingItem = state.items.find(
        (cartItem) => getCartKey(cartItem) === getCartKey(normalizedItem),
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push(normalizedItem);
      }

      saveCartToStorage(state.items);
    },
    increaseQuantity(state, action) {
      const item = state.items.find((cartItem) => matchesCartItem(cartItem, action.payload));

      if (item) {
        item.quantity += 1;
        saveCartToStorage(state.items);
      }
    },
    decreaseQuantity(state, action) {
      const item = state.items.find((cartItem) => matchesCartItem(cartItem, action.payload));

      if (!item) {
        return;
      }

      item.quantity -= 1;
      state.items = state.items.filter((cartItem) => cartItem.quantity > 0);
      saveCartToStorage(state.items);
    },
    removeItem(state, action) {
      state.items = state.items.filter((cartItem) => !matchesCartItem(cartItem, action.payload));
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
        const serverItems = Array.isArray(action.payload)
          ? action.payload.map(normalizeCartItem)
          : [];
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
        state.error = null;
        const newItem = normalizeCartItem(action.payload);
        const existingItem = state.items.find((item) => getCartKey(item) === getCartKey(newItem));

        if (existingItem) {
          Object.assign(existingItem, newItem);
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
        state.error = null;
        const updatedItem = normalizeCartItem(action.payload);
        const item = state.items.find((i) => getCartKey(i) === getCartKey(updatedItem));

        if (item) {
          Object.assign(item, updatedItem);
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
        state.error = null;
        state.items = state.items.filter((item) => !matchesCartItem(item, action.payload));
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
        state.error = null;
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
