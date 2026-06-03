import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const CART_STORAGE_KEY = 'cart_items';

/** Matches backend CartService.getMenuItemPrice — discount applies only without a variant. */
export function getEffectiveMenuPrice(menuItem, variant = null) {
  if (variant != null && variant.price != null) {
    return Number(variant.price);
  }

  const source = menuItem?.menuItem ?? menuItem ?? {};
  const price = Number(source.price ?? menuItem?.price ?? 0);
  const discountPrice = source.discountPrice ?? menuItem?.discountPrice;

  if (
    discountPrice != null &&
    discountPrice > 0 &&
    discountPrice < price
  ) {
    return Number(discountPrice);
  }

  return price;
}

function getAddOnKey(addOns = []) {
  return addOns
    .map((addOn) => `${addOn.addonGroupId}:${addOn.addonOptionId}`)
    .sort()
    .join(',');
}

function getCartKey(item) {
  const menuItemId = item.menuItemId ?? item.id;
  const variantId = item.variantId ?? item.variant?.id ?? 'base';
  const addOnsKey = getAddOnKey(item.addOns ?? item.addons ?? []);
  return `${menuItemId}:${variantId}:${addOnsKey || 'no-addons'}`;
}

function normalizeCartItem(item) {
  const menuItem = item.menuItem ?? item;
  const menuItemId = item.menuItemId ?? menuItem.id ?? item.id;

  if (menuItemId == null || Number.isNaN(Number(menuItemId))) {
    return null;
  }

  const variant = item.variant ?? null;
  const variantId = variant?.id ?? item.variantId ?? null;
  const addOns = item.addOns ?? item.addons ?? [];

  const addOnsTotal = addOns.reduce(
    (sum, addOn) => sum + (addOn.price ?? addOn.addonOptionPrice ?? 0),
    0,
  );
  const baseItemPrice = getEffectiveMenuPrice(menuItem, variant);
  const unitPrice = baseItemPrice + addOnsTotal;

  const cartKey = item.cartKey ?? getCartKey({ menuItemId, variantId, addOns });

  return {
    cartKey,
    id: menuItemId,
    cartItemId: item.cartItemId ?? cartKey,
    menuItemId,
    variantId,
    name: menuItem.name ?? item.name ?? 'Menu item',
    category: menuItem.category ?? item.category,
    restaurantId:
      menuItem.restaurantId ?? item.restaurantId ?? menuItem.restaurant?.id,
    basePrice: baseItemPrice,
    price: unitPrice,
    quantity: Math.max(1, Number(item.quantity ?? 1)),
    menuItem,
    variant,
    addOns,
  };
}

function mergeCartItems(items) {
  const merged = new Map();

  for (const raw of items) {
    const normalized = normalizeCartItem(raw);
    if (!normalized) {
      continue;
    }

    const existing = merged.get(normalized.cartKey);
    if (existing) {
      existing.quantity += normalized.quantity;
      if (
        !existing.menuItem?.name ||
        existing.price === 0 ||
        existing.name === 'Menu item'
      ) {
        existing.menuItem = normalized.menuItem;
        existing.name = normalized.name;
        existing.restaurantId = normalized.restaurantId;
        existing.price = normalized.price;
        existing.basePrice = normalized.basePrice;
        existing.variant = normalized.variant;
        existing.addOns = normalized.addOns;
      }
    } else {
      merged.set(normalized.cartKey, normalized);
    }
  }

  return [...merged.values()];
}

function matchesCartItem(item, keyOrId) {
  return (
    item.cartKey === keyOrId ||
    getCartKey(item) === keyOrId ||
    String(item.id) === String(keyOrId) ||
    String(item.menuItemId) === String(keyOrId)
  );
}

// Load cart from localStorage
const loadCartFromStorage = () => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    const rawItems = Array.isArray(parsed) ? parsed : [];
    const merged = mergeCartItems(rawItems);

    if (rawItems.length !== merged.length) {
      saveCartToStorage(merged);
    }

    return merged;
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

// Async thunks redefined to run locally for zero latency and addon differentiation
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      return loadCartFromStorage();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const addToCartAsync = createAsyncThunk(
  'cart/addToCartAsync',
  async (payload, { rejectWithValue, dispatch }) => {
    try {
      dispatch(addToCart(payload));
      return payload;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const updateCartItemAsync = createAsyncThunk(
  'cart/updateCartItemAsync',
  async (payload, { rejectWithValue, dispatch }) => {
    try {
      const cartKey = payload.cartKey ?? payload.menuItemId;
      const quantity = payload.quantity ?? payload.payload?.quantity;
      dispatch(updateQuantityLocal({ cartKey, quantity }));
      return { cartKey, quantity };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const removeFromCartAsync = createAsyncThunk(
  'cart/removeFromCartAsync',
  async (cartKey, { rejectWithValue, dispatch }) => {
    try {
      dispatch(removeItem(cartKey));
      return cartKey;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const clearCartAsync = createAsyncThunk(
  'cart/clearCartAsync',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      dispatch(clearCart());
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

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
      const { item, variant, addOns = [], quantity = 1 } = action.payload;

      if (!item) {
        return;
      }

      const normalizedItem = normalizeCartItem({ ...item, variant, addOns, quantity });

      if (!normalizedItem) {
        return;
      }
      const existingItem = state.items.find(
        (cartItem) => cartItem.cartKey === normalizedItem.cartKey,
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push(normalizedItem);
      }

      saveCartToStorage(state.items);
    },
    increaseQuantity(state, action) {
      const cartKey = action.payload;
      const item = state.items.find((cartItem) => matchesCartItem(cartItem, cartKey));

      if (item) {
        item.quantity += 1;
        saveCartToStorage(state.items);
      }
    },
    decreaseQuantity(state, action) {
      const cartKey = action.payload;
      const item = state.items.find((cartItem) => matchesCartItem(cartItem, cartKey));

      if (!item) {
        return;
      }

      item.quantity -= 1;
      state.items = state.items.filter((cartItem) => cartItem.quantity > 0);
      saveCartToStorage(state.items);
    },
    removeItem(state, action) {
      const cartKey = action.payload;
      state.items = state.items.filter((cartItem) => !matchesCartItem(cartItem, cartKey));
      saveCartToStorage(state.items);
    },
    updateQuantityLocal(state, action) {
      const { cartKey, quantity } = action.payload;
      const item = state.items.find((cartItem) => matchesCartItem(cartItem, cartKey));
      if (item) {
        item.quantity = quantity;
        state.items = state.items.filter((cartItem) => cartItem.quantity > 0);
        saveCartToStorage(state.items);
      }
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
        const serverItems = Array.isArray(action.payload)
          ? mergeCartItems(action.payload)
          : [];

        if (serverItems.length === 0 && state.items.length > 0) {
          saveCartToStorage(state.items);
          return;
        }

        state.items = serverItems;
        saveCartToStorage(state.items);
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.syncing = false;
        state.error = action.payload;
      })
      // Add to Cart Async
      .addCase(addToCartAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(addToCartAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(addToCartAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Cart Item Async
      .addCase(updateCartItemAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCartItemAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(updateCartItemAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Remove from Cart Async
      .addCase(removeFromCartAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeFromCartAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(removeFromCartAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Clear Cart Async
      .addCase(clearCartAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(clearCartAsync.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
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
  updateQuantityLocal,
  clearCart,
  setLastOrderId,
  clearError,
} = cartSlice.actions;

export default cartSlice.reducer;
