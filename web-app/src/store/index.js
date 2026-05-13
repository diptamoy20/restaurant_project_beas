import { configureStore } from '@reduxjs/toolkit';
import { setAuthRefreshHandler, setAuthTokenGetter, setUnauthorizedHandler } from '../lib/api';
import authReducer from './slices/authSlice';
import { logout, refreshSession } from './slices/authSlice';
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
setAuthRefreshHandler(async () => {
  const result = await store.dispatch(refreshSession());

  if (refreshSession.fulfilled.match(result)) {
    return result.payload.token;
  }

  return null;
});
setUnauthorizedHandler(({ token } = {}) => {
  const currentToken = store.getState().auth?.token;

  if (!token || token === currentToken) {
    store.dispatch(logout());
  }
});
