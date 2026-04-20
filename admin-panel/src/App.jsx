import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminLayout } from './layouts/AdminLayout';
import { CategoriesPage } from './pages/CategoriesPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { MenuPage } from './pages/MenuPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrdersPage } from './pages/OrdersPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { StaffPage } from './pages/StaffPage';
import { ProtectedRoute } from './routes/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route element={<Navigate replace to="/dashboard" />} path="/" />
          <Route element={<DashboardPage />} path="/dashboard" />

          <Route element={<ProtectedRoute module="orders" />}>
            <Route element={<OrdersPage />} path="/orders" />
          </Route>

          <Route element={<ProtectedRoute module="menu" />}>
            <Route element={<MenuPage />} path="/menu" />
          </Route>

          <Route element={<ProtectedRoute module="categories" />}>
            <Route element={<CategoriesPage />} path="/categories" />
          </Route>

          <Route element={<ProtectedRoute module="customers" />}>
            <Route element={<CustomersPage />} path="/customers" />
          </Route>

          <Route element={<ProtectedRoute module="payments" />}>
            <Route element={<PaymentsPage />} path="/payments" />
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

