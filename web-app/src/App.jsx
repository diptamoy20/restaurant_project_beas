import { Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AIChatbot } from './components/AIChatbot/AIChatbot';

import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentPage } from './pages/PaymentPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { OrdersPage } from './pages/OrdersPage';
import { FavoritesPage } from './pages/FavoritesPage';

import { useSelectedRestaurant } from './context/SelectedRestaurantContext.jsx';

export default function App() {
  const { selectedRestaurantId } =
    useSelectedRestaurant();

  const token = useSelector(
    (state) => state.auth.token,
  );

  const aiRestaurantId = token
    ? selectedRestaurantId
    : null;

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/menu/:slug"
          element={<MenuPage />}
        />

        <Route
          path="/menu"
          element={<MenuPage />}
        />

        <Route
          path="/cart"
          element={<CartPage />}
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/register"
          element={<RegisterPage />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />

        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />

        <Route element={<ProtectedRoute />}>
          <Route
            path="/checkout"
            element={<CheckoutPage />}
          />

          <Route
            path="/payment/:orderId"
            element={<PaymentPage />}
          />

          <Route
            path="/profile"
            element={<ProfilePage />}
          />

          <Route
            path="/orders"
            element={<OrdersPage />}
          />

          <Route
            path="/favorites"
            element={<FavoritesPage />}
          />
        </Route>
      </Routes>

      <AIChatbot
        restaurantId={aiRestaurantId}
      />
    </Layout>
  );
}