import { useSelector } from 'react-redux';

import { canAccess } from '../routes/accessControl';

export function PermissionGate({ module, action = 'view', fallback = null, children }) {
  const permissions = useSelector((state) => state.auth.permissions);

  if (!canAccess(permissions, module, action)) {
    return fallback;
  }

  return children;
}

