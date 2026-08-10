import { Navigate, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { AdminLayout } from './layouts/AdminLayout';
import { CategoriesPage } from './pages/CategoriesPage';
import { CouponsPage } from './pages/CouponsPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeliveryDashboardPage } from './pages/DeliveryDashboardPage';
import { DeliveryOrdersPage } from './pages/DeliveryOrdersPage';
import { LoginPage } from './pages/LoginPage';
import { MenuPage } from './pages/MenuPage';
import { RestaurantsPage } from './pages/RestaurantsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrdersPage } from './pages/OrdersPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { StaffPage } from './pages/StaffPage';
import { TablesPage } from './pages/TablesPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { hasBackendRole } from './utils/auth';
import { KitchenLayout } from './pages/kitchen/KitchenLayout';
import { KitchenWorkspacePage } from './pages/kitchen/KitchenWorkspacePage';
import { KitchenDashboardPage } from './pages/kitchen/KitchenDashboardPage';
import { KitchenInventoryPage } from './pages/kitchen/KitchenInventoryPage';
import { KitchenRequestsPage } from './pages/kitchen/KitchenRequestsPage';
import { ConsumptionHistoryPage } from './pages/kitchen/ConsumptionHistoryPage';
import { KitchenDisplayPage } from './pages/kitchen/KitchenDisplayPage';

function DashboardRoute() {
  const user = useSelector((state) => state.auth.user);

  if (hasBackendRole(user, 'delivery_boy')) {
    return <DeliveryDashboardPage />;
  }
  return <DashboardPage />;
}

function OrdersRoute() {
  const user = useSelector((state) => state.auth.user);

  return hasBackendRole(user, 'delivery_boy') ? <DeliveryOrdersPage /> : <OrdersPage />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route element={<Navigate replace to="/dashboard" />} path="/" />
          <Route element={<DashboardRoute />} path="/dashboard" />

          <Route element={<ProtectedRoute module="orders" />}>
            <Route element={<OrdersRoute />} path="/orders" />
          </Route>

          <Route element={<Navigate replace to="/tables" />} path="/restaurant-tables" />

          <Route element={<ProtectedRoute module="restaurants" />}>
            <Route element={<RestaurantsPage />} path="/restaurants" />
          </Route>

          <Route element={<ProtectedRoute module="categories" />}>
            <Route element={<CategoriesPage />} path="/categories" />
          </Route>

          <Route element={<ProtectedRoute module="menu" />}>
            <Route element={<MenuPage />} path="/menu" />
          </Route>

          <Route element={<ProtectedRoute module="kitchen" />}>
            <Route element={<KitchenWorkspacePage />} path="/kitchen" />
            <Route element={<KitchenLayout />}>
              <Route element={<KitchenDashboardPage />} path="/restaurants/:restaurantSlug/kitchen/dashboard" />
              <Route element={<KitchenInventoryPage />} path="/restaurants/:restaurantSlug/kitchen/inventory" />
              <Route element={<KitchenRequestsPage />} path="/restaurants/:restaurantSlug/kitchen/requests" />
              <Route element={<ConsumptionHistoryPage />} path="/restaurants/:restaurantSlug/kitchen/consumption" />
              <Route element={<KitchenDisplayPage />} path="/restaurants/:restaurantSlug/kitchen/display" />
            </Route>
          </Route>

          <Route element={<ProtectedRoute module="coupons" />}>
            <Route element={<CouponsPage />} path="/coupons" />
          </Route>

          <Route element={<ProtectedRoute module="customers" />}>
            <Route element={<CustomersPage />} path="/customers" />
          </Route>

          <Route element={<ProtectedRoute module="payments" />}>
            <Route element={<PaymentsPage />} path="/payments" />
          </Route>

          <Route element={<ProtectedRoute module="tables" />}>
            <Route element={<TablesPage />} path="/tables" />
          </Route>

          <Route element={<ProtectedRoute module="staff" />}>
            <Route element={<StaffPage />} path="/staff" />
          </Route>

          <Route element={<NotFoundPage />} path="*" />
        </Route>
      </Route>
    </Routes>
  );
}
