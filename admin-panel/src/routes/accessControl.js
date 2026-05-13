import { defaultPermissionsByRole } from '../utils/auth';

export const routeDefinitions = [
  { path: '/dashboard', label: 'Dashboard', module: 'dashboard' },
  { path: '/orders', label: 'Orders', module: 'orders' },
  { path: '/restaurants', label: 'Manage Restaurants', module: 'restaurants' },
  { path: '/categories', label: 'Categories', module: 'categories' },
  { path: '/customers', label: 'Customers', module: 'customers' },
  { path: '/payments', label: 'Payments', module: 'payments' },
  { path: '/staff', label: 'Staff', module: 'staff' },
];

export function canAccess(permissions, module, action = 'view') {
  return Boolean(permissions?.[module]?.includes(action));
}

export function getVisibleRoutes(role, permissions = {}) {
  const effectivePermissions = Object.keys(permissions).length
    ? permissions
    : defaultPermissionsByRole[role] ?? {};

  return routeDefinitions.filter((route) => canAccess(effectivePermissions, route.module));
}

