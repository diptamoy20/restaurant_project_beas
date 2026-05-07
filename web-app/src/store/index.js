import { configureStore } from "@reduxjs/toolkit";
import { setAuthTokenGetter, setUnauthorizedHandler } from "../lib/api";
import authReducer, { logout } from "./slices/authSlice";
import cartReducer from "./slices/cartSlice";
import menuReducer from "./slices/menuSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    menu: menuReducer,
  },
});

setAuthTokenGetter(() => store.getState().auth?.token ?? null);
setUnauthorizedHandler(() => store.dispatch(logout()));
