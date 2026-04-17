import { Routes, Route } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { MenuManagementPage } from './pages/MenuManagementPage';
import { OrdersPage } from './pages/OrdersPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/menu" element={<MenuManagementPage />} />
          <Route path="/orders" element={<OrdersPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
