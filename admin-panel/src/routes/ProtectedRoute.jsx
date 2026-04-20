import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { canAccess } from './accessControl';

export function ProtectedRoute({ module, action = 'view' }) {
  const location = useLocation();
  const { token, permissions } = useSelector((state) => state.auth);

  if (!token) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (module && !canAccess(permissions, module, action)) {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}

