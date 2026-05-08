import { configureStore } from '@reduxjs/toolkit';
import { setAuthTokenGetter, setUnauthorizedHandler } from '../lib/api';
import authReducer from './slices/authSlice';
import { logout } from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import menuReducer from './slices/menuSlice';
import paymentReducer from './slices/paymentSlice';
import orderReducer from './slices/orderSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    menu: menuReducer,
    payments: paymentReducer,
    orders: orderReducer,
  },
});

setAuthTokenGetter(() => store.getState().auth?.token ?? null);
setUnauthorizedHandler(() => store.dispatch(logout()));
