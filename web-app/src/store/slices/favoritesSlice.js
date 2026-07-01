import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { favoritesApi } from '../../services/favoritesApi';

// ─── Async Thunks ──────────────────────────────────────────────────────────────

export const fetchFavorites = createAsyncThunk(
  'favorites/fetchFavorites',
  async (_, { rejectWithValue }) => {
    try {
      const response = await favoritesApi.getFavorites();
      // Backend returns { success, total, data: MenuItem[] }
      const items = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];
      return items;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const addFavorite = createAsyncThunk(
  'favorites/addFavorite',
  async (menuItemId, { rejectWithValue }) => {
    try {
      await favoritesApi.addFavorite(menuItemId);
      return menuItemId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const removeFavorite = createAsyncThunk(
  'favorites/removeFavorite',
  async (menuItemId, { rejectWithValue }) => {
    try {
      await favoritesApi.removeFavorite(menuItemId);
      return menuItemId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// ─── Slice ─────────────────────────────────────────────────────────────────────

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState: {
    /** Set of menu item IDs the current user has favorited (numbers) */
    ids: [],
    /** Full favorite MenuItem objects for the /favorites page */
    items: [],
    loading: false,
    toggling: {}, // { [menuItemId]: true } while an add/remove is in-flight
    error: null,
  },
  reducers: {
    /** Called on logout to wipe local favorites state */
    clearFavorites(state) {
      state.ids = [];
      state.items = [];
      state.loading = false;
      state.toggling = {};
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch ──────────────────────────────────────────────────────────────
      .addCase(fetchFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.ids = action.payload.map((item) => item.id);
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load favorites';
      })

      // ── Add ────────────────────────────────────────────────────────────────
      .addCase(addFavorite.pending, (state, action) => {
        state.toggling[action.meta.arg] = true;
        // Optimistic: add id immediately so heart fills without waiting for API
        if (!state.ids.includes(action.meta.arg)) {
          state.ids.push(action.meta.arg);
        }
      })
      .addCase(addFavorite.fulfilled, (state, action) => {
        delete state.toggling[action.payload];
        // ids already set optimistically; nothing more needed
      })
      .addCase(addFavorite.rejected, (state, action) => {
        // Roll back optimistic update
        state.ids = state.ids.filter((id) => id !== action.meta.arg);
        delete state.toggling[action.meta.arg];
        state.error = action.payload || 'Failed to add favorite';
      })

      // ── Remove ─────────────────────────────────────────────────────────────
      .addCase(removeFavorite.pending, (state, action) => {
        state.toggling[action.meta.arg] = true;
        // Optimistic: remove id immediately so heart empties without waiting
        state.ids = state.ids.filter((id) => id !== action.meta.arg);
      })
      .addCase(removeFavorite.fulfilled, (state, action) => {
        delete state.toggling[action.payload];
        // Also remove the full item object from the favorites list
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(removeFavorite.rejected, (state, action) => {
        // Roll back optimistic update
        if (!state.ids.includes(action.meta.arg)) {
          state.ids.push(action.meta.arg);
        }
        delete state.toggling[action.meta.arg];
        state.error = action.payload || 'Failed to remove favorite';
      });
  },
});

export const { clearFavorites } = favoritesSlice.actions;
export default favoritesSlice.reducer;
