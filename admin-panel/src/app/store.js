import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';

import authReducer, { logout } from '../features/auth/authSlice';
import uiReducer from '../features/ui/uiSlice';
import { analyticsApi } from '../services/analyticsApi';
import { authApi } from '../services/authApi';
import { customerApi } from '../services/customerApi';
import { deliveryApi } from '../services/deliveryApi';
import { couponApi } from '../services/couponApi';
import { menuApi } from '../services/menuApi';
import { orderApi } from '../services/orderApi';
import { paymentApi } from '../services/paymentApi';
import { userApi } from '../services/userApi';
import { restaurantApi } from '../services/restaurantApi';
import { persistAuthState } from '../utils/auth';

const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  actionCreator: logout,
  effect: (_action, listenerApi) => {
    listenerApi.dispatch(authApi.util.resetApiState());
    listenerApi.dispatch(userApi.util.resetApiState());
    listenerApi.dispatch(menuApi.util.resetApiState());
    listenerApi.dispatch(orderApi.util.resetApiState());
    listenerApi.dispatch(customerApi.util.resetApiState());
    listenerApi.dispatch(deliveryApi.util.resetApiState());
    listenerApi.dispatch(couponApi.util.resetApiState());
    listenerApi.dispatch(paymentApi.util.resetApiState());
    listenerApi.dispatch(analyticsApi.util.resetApiState());
    listenerApi.dispatch(restaurantApi.util.resetApiState());
  },
});

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [menuApi.reducerPath]: menuApi.reducer,
    [orderApi.reducerPath]: orderApi.reducer,
    [customerApi.reducerPath]: customerApi.reducer,
    [deliveryApi.reducerPath]: deliveryApi.reducer,
    [couponApi.reducerPath]: couponApi.reducer,
    [paymentApi.reducerPath]: paymentApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
    [restaurantApi.reducerPath]: restaurantApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .prepend(listenerMiddleware.middleware)
      .concat(
        authApi.middleware,
        userApi.middleware,
        menuApi.middleware,
        orderApi.middleware,
        customerApi.middleware,
        deliveryApi.middleware,
        couponApi.middleware,
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
