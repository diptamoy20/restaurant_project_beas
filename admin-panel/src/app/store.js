import { configureStore } from '@reduxjs/toolkit';

import authReducer from '../features/auth/authSlice';
import uiReducer from '../features/ui/uiSlice';
import { analyticsApi } from '../services/analyticsApi';
import { authApi } from '../services/authApi';
import { customerApi } from '../services/customerApi';
import { menuApi } from '../services/menuApi';
import { orderApi } from '../services/orderApi';
import { paymentApi } from '../services/paymentApi';
import { userApi } from '../services/userApi';
import { restaurantApi } from '../services/restaurantApi';
import { persistAuthState } from '../utils/auth';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [menuApi.reducerPath]: menuApi.reducer,
    [orderApi.reducerPath]: orderApi.reducer,
    [customerApi.reducerPath]: customerApi.reducer,
    [paymentApi.reducerPath]: paymentApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
    [restaurantApi.reducerPath]: restaurantApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      userApi.middleware,
      menuApi.middleware,
      orderApi.middleware,
      customerApi.middleware,
      paymentApi.middleware,
      analyticsApi.middleware,
      restaurantApi.middleware,
    ),
});

store.subscribe(() => {
  const { auth } = store.getState();

  if (auth.token) {
    persistAuthState(auth);
  }
});

