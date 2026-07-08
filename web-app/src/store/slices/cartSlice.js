import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { cartApi } from "../../services/cartApi";

const CART_STORAGE_KEY = "cart_items";

function cleanApiError(message = "") {
  const cleaned = message.replace(/\s*\(requestId:.*?\)/, "");
  if (
    cleaned.includes("different restaurant") ||
    cleaned.includes("Please clear your cart first")
  ) {
    return "Your cart already contains items from another restaurant. Please clear the cart before adding new items.";
  }
  return cleaned;
}

/** Matches backend CartService.getMenuItemPrice — discount applies only without a variant. */
export function getEffectiveMenuPrice(menuItem, variant = null) {
  if (variant != null && variant.price != null) {
    return Number(variant.price);
  }

  const source = menuItem?.menuItem ?? menuItem ?? {};
  const price = Number(source.price ?? menuItem?.price ?? 0);
  const discountPrice = source.discountPrice ?? menuItem?.discountPrice;

  if (discountPrice != null && discountPrice > 0 && discountPrice < price) {
    return Number(discountPrice);
  }

  return price;
}

function getAddOnKey(addOns = []) {
  return addOns
    .map((addOn) => `${addOn.addonGroupId}:${addOn.addonOptionId}`)
    .sort()
    .join(",");
}

function getCartKey(item) {
  const menuItemId = item.menuItemId ?? item.id;
  const variantId = item.variantId ?? item.variant?.id ?? "base";
  const addOnsKey = getAddOnKey(item.addOns ?? item.addons ?? []);
  return `${menuItemId}:${variantId}:${addOnsKey || "no-addons"}`;
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
    name: menuItem.name ?? item.name ?? "Menu item",
    category: menuItem.category ?? item.category,
    restaurantId:
      menuItem.restaurantId ?? item.restaurantId ?? menuItem.restaurant?.id,
    restaurantName:
      item.restaurantName ??
      item.restaurant?.name ??
      menuItem.restaurant?.name ??
      null,
    restaurant:
      item.restaurant ??
      menuItem.restaurant ??
      (item.restaurantName || menuItem.restaurant?.name
        ? {
            id: menuItem.restaurantId ?? item.restaurantId,
            name: item.restaurantName ?? menuItem.restaurant?.name,
          }
        : null),
    basePrice: baseItemPrice,
    price: unitPrice * Math.max(1, Number(item.quantity ?? 1)),
    unitPrice: unitPrice,
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
        existing.name === "Menu item"
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
    console.error("Failed to save cart to storage:", error);
  }
};

function mapServerAddOns(addOns = []) {
  return addOns
    .map((addon) => ({
      addonGroupId: Number(addon.addonGroupId),
      addonOptionId: Number(addon.addonOptionId),
      quantity: Math.max(1, Number(addon.quantity ?? 1)),
      name: addon.name,
      price: addon.price ?? addon.addonOptionPrice,
    }))
    .filter(
      (addon) =>
        Number.isInteger(addon.addonGroupId) &&
        addon.addonGroupId > 0 &&
        Number.isInteger(addon.addonOptionId) &&
        addon.addonOptionId > 0,
    );
}

function mapServerCart(cart) {
  return (cart?.cartItems || []).map((item) => ({
    cartItemId: item.cartItemId,
    menuItemId: item.menuItemId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    unitPrice: item.unitPrice,
    addOns: mapServerAddOns(item.addOns || []),
    cartKey: String(item.cartItemId),

    restaurantId: item.restaurantId,
    restaurantName: item.restaurantName ?? item.restaurant?.name ?? null,
    restaurant: item.restaurantName
      ? { id: item.restaurantId, name: item.restaurantName }
      : item.restaurant ?? null,
    image: item.image,
    description: item.description,
    rating: item.rating,
    ingredients: item.ingredients,
    bestSeller: item.bestSeller,
  }));
}

// Async thunks redefined to run locally for zero latency and addon differentiation
// export const fetchCart = createAsyncThunk(
//   "cart/fetchCart",
//   async (_, { rejectWithValue }) => {
//     try {
//       // return loadCartFromStorage();
//       const response = await cartApi.getCart();

//       return response;
//     } catch (error) {
//       return rejectWithValue(error.message);
//     }
//   },
// );

export const fetchCart = createAsyncThunk(
  "cart/fetchCart",
  async (_, { rejectWithValue }) => {
    try {
      return await cartApi.getCart();
    } catch (error) {
      return rejectWithValue(
        error?.message || error?.toString?.() || 'Cart request failed',
      );
    }
  },
);

// export const addToCartAsync = createAsyncThunk(
//   "cart/addToCartAsync",
//   async (payload, { rejectWithValue, dispatch }) => {
//     try {
//       // dispatch(addToCart(payload));
//       const response = await cartApi.addToCart(payload);

// return response;
//       return payload;
//     } catch (error) {
//       return rejectWithValue(error.message);
//     }
//   },
// );

export const addToCartAsync = createAsyncThunk(
  "cart/addToCartAsync",
  async (payload, { rejectWithValue }) => {
    try {
      const serverPayload = {
        restaurantId: Number(payload.item?.restaurantId ?? payload.restaurantId),
        menuItemId: Number(payload.item?.id ?? payload.menuItemId),
        variantId: payload.variant?.id ?? payload.variantId ?? null,
        quantity: Number(payload.quantity),
        addOns: (payload.addOns ?? []).map((addon) => ({
          addonGroupId: Number(addon.addonGroupId),
          addonOptionId: Number(addon.addonOptionId),
          quantity: Number(addon.quantity ?? 1),
        })),
      };
      return await cartApi.addToCart(serverPayload);
    } catch (error) {
      return rejectWithValue(
        error?.message || error?.toString?.() || 'Cart request failed',
      );
    }
  },
);

// export const updateCartItemAsync = createAsyncThunk(
//   "cart/updateCartItemAsync",
//   async (payload, { rejectWithValue, dispatch }) => {
//     try {
//       const cartKey = payload.cartKey ?? payload.menuItemId;
//       const quantity = payload.quantity ?? payload.payload?.quantity;
//       // dispatch(updateQuantityLocal({ cartKey, quantity }));
//       const response =
//  await cartApi.updateCartItem(
//    payload.cartItemId,
//    {
//      quantity: payload.quantity,
//      addOns: payload.addOns,
//    },
//  );

// return response;
//       return { cartKey, quantity };
//     } catch (error) {
//       return rejectWithValue(error.message);
//     }
//   },
// );

export const updateCartItemAsync = createAsyncThunk(
  "cart/updateCartItemAsync",
  async (payload, { rejectWithValue }) => {
    try {
      return await cartApi.updateCartItem(payload.cartItemId, {
        quantity: payload.quantity,
        addOns: payload.addOns,
      });
    } catch (error) {
      return rejectWithValue(
        error?.message || error?.toString?.() || 'Cart request failed',
      );
    }
  },
);

// export const removeFromCartAsync = createAsyncThunk(
//   "cart/removeFromCartAsync",
//   async (cartKey, { rejectWithValue, dispatch }) => {
//     try {
//       const response =
//  await cartApi.removeFromCart(cartItemId);

// return response;
//       return cartKey;
//     } catch (error) {
//       return rejectWithValue(error.message);
//     }
//   },
// );

export const removeFromCartAsync = createAsyncThunk(
  "cart/removeFromCartAsync",
  async (cartItemId, { rejectWithValue }) => {
    try {
      return await cartApi.removeFromCart(cartItemId);
    } catch (error) {
      return rejectWithValue(
        error?.message || error?.toString?.() || 'Cart request failed',
      );
    }
  },
);

// export const clearCartAsync = createAsyncThunk(
//   "cart/clearCartAsync",
//   async (_, { rejectWithValue, dispatch }) => {
//     try {
//       dispatch(clearCart());
//       return null;
//     } catch (error) {
//       return rejectWithValue(error.message);
//     }
//   },
// );

export const clearCartAsync = createAsyncThunk(
  "cart/clearCartAsync",
  async (_, { rejectWithValue }) => {
    try {
      return await cartApi.clearCart();
    } catch (error) {
      return rejectWithValue(
        error?.message || error?.toString?.() || 'Cart request failed',
      );
    }
  },
);

const cartSlice = createSlice({
  name: "cart",
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

      const normalizedItem = normalizeCartItem({
        ...item,
        variant,
        addOns,
        quantity,
      });

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
      const item = state.items.find((cartItem) =>
        matchesCartItem(cartItem, cartKey),
      );

      if (item) {
        item.quantity += 1;
        saveCartToStorage(state.items);
      }
    },
    decreaseQuantity(state, action) {
      const cartKey = action.payload;
      const item = state.items.find((cartItem) =>
        matchesCartItem(cartItem, cartKey),
      );

      if (!item) {
        return;
      }

      item.quantity -= 1;
      state.items = state.items.filter((cartItem) => cartItem.quantity > 0);
      saveCartToStorage(state.items);
    },
    removeItem(state, action) {
      const cartKey = action.payload;
      state.items = state.items.filter(
        (cartItem) => !matchesCartItem(cartItem, cartKey),
      );
      saveCartToStorage(state.items);
    },
    updateQuantityLocal(state, action) {
      const { cartKey, quantity } = action.payload;
      const item = state.items.find((cartItem) =>
        matchesCartItem(cartItem, cartKey),
      );
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
      //       .addCase(fetchCart.fulfilled, (state, action) => {
      //         state.syncing = false;
      //         const serverItems = Array.isArray(action.payload)
      //           ? mergeCartItems(action.payload)
      //           : [];

      //         if (serverItems.length === 0 && state.items.length > 0) {
      //           saveCartToStorage(state.items);
      //           return;
      //         }

      //         // state.items = serverItems;
      //         state.items =
      //  mapServerCart(action.payload);
      //         saveCartToStorage(state.items);
      //       })

      .addCase(fetchCart.fulfilled, (state, action) => {
        state.syncing = false;
        state.items = mapServerCart(action.payload);
        saveCartToStorage(state.items);
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.syncing = false;
        state.error = cleanApiError(action.payload);
      })
      // Add to Cart Async
      .addCase(addToCartAsync.pending, (state) => {
        state.loading = true;
      })
      // .addCase(addToCartAsync.fulfilled, (state, action) => {
      //   state.loading = false;
      //   state.error = null;
      // })

      .addCase(addToCartAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        state.items = mapServerCart(action.payload);

        saveCartToStorage(state.items);
      })
      .addCase(addToCartAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = cleanApiError(action.payload);
      })
      // Update Cart Item Async
      .addCase(updateCartItemAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCartItemAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        state.items = mapServerCart(action.payload);

        saveCartToStorage(state.items);
      })
      .addCase(updateCartItemAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = cleanApiError(action.payload);
      })

      // Remove from Cart Async
      .addCase(removeFromCartAsync.pending, (state) => {
        state.loading = true;
      })
      // .addCase(removeFromCartAsync.fulfilled, (state, action) => {
      //   state.loading = false;
      //   state.error = null;
      // })
      .addCase(removeFromCartAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = cleanApiError(action.payload);
      })

      .addCase(removeFromCartAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        state.items = mapServerCart(action.payload);

        saveCartToStorage(state.items);
      })

      // Clear Cart Async
      .addCase(clearCartAsync.pending, (state) => {
        state.loading = true;
      })
      // .addCase(clearCartAsync.fulfilled, (state) => {
      //   state.loading = false;
      //   state.error = null;
      // })
      .addCase(clearCartAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = cleanApiError(action.payload);
      })
      .addCase(clearCartAsync.fulfilled, (state) => {
        state.loading = false;
        state.error = null;

        state.items = [];

        saveCartToStorage([]);
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