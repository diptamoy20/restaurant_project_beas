import { Navigate, Route, Routes } from 'react-router-dom';

import { CartPage } from './pages/CartPage';
import { MenuPage } from './pages/MenuPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';

export function QRApp() {
  return (
    <Routes>
      <Route path="/menu/:restaurantId/:tableId" element={<MenuPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/order-success" element={<OrderSuccessPage />} />
      <Route path="*" element={<Navigate to="/menu/1/1" replace />} />
    </Routes>
  );
}
