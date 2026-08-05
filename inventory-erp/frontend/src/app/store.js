import { configureStore, createSlice } from '@reduxjs/toolkit';

const initialAuth = JSON.parse(localStorage.getItem('erp_auth')) || {
  token: null,
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuth,
  reducers: {
    setCredentials(state, action) {
      state.token = action.payload.accessToken;
      state.user = action.payload.user;
      localStorage.setItem('erp_auth', JSON.stringify(state));
    },
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('erp_auth');
      localStorage.removeItem('erp_warehouse');
      localStorage.removeItem('erp_restaurant');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
  },
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
  },
});

export const { toggleSidebar } = uiSlice.actions;

const warehouseSlice = createSlice({
  name: 'warehouse',
  initialState: JSON.parse(localStorage.getItem('erp_warehouse')) || {
    warehouseId: null,
    warehouseName: null,
  },
  reducers: {
    setWarehouse(state, action) {
      state.warehouseId = action.payload.warehouseId;
      state.warehouseName = action.payload.warehouseName;
      localStorage.setItem('erp_warehouse', JSON.stringify(state));
    },
    clearWarehouse(state) {
      state.warehouseId = null;
      state.warehouseName = null;
      localStorage.removeItem('erp_warehouse');
    },
  },
});

export const { setWarehouse, clearWarehouse } = warehouseSlice.actions;

const restaurantSlice = createSlice({
  name: 'restaurant',
  initialState: JSON.parse(localStorage.getItem('erp_restaurant')) || {
    restaurantId: null,
    restaurantSlug: null,
    restaurantName: null,
  },
  reducers: {
    setRestaurant(state, action) {
      state.restaurantId = action.payload.restaurantId;
      state.restaurantSlug = action.payload.restaurantSlug;
      state.restaurantName = action.payload.restaurantName;
      localStorage.setItem('erp_restaurant', JSON.stringify(state));
    },
    clearRestaurant(state) {
      state.restaurantId = null;
      state.restaurantSlug = null;
      state.restaurantName = null;
      localStorage.removeItem('erp_restaurant');
    },
  },
});

export const { setRestaurant, clearRestaurant } = restaurantSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    ui: uiSlice.reducer,
    warehouse: warehouseSlice.reducer,
    restaurant: restaurantSlice.reducer,
  },
});
