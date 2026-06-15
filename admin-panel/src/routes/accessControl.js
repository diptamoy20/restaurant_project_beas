import { defaultPermissionsByRole } from '../utils/auth';

export const routeDefinitions = [
  { path: '/dashboard', label: 'Dashboard', module: 'dashboard' },
  { path: '/orders', label: 'Orders', module: 'orders' },
  { path: '/restaurants', label: 'Manage Restaurants', module: 'restaurants' },
  { path: '/restaurant-tables', label: 'Table Management', module: 'restaurants' },
  { path: '/categories', label: 'Categories', module: 'categories' },
  { path: '/menu', label: 'Manage Menu', module: 'menu' },
  { path: '/coupons', label: 'Coupons', module: 'coupons' },
  { path: '/customers', label: 'Customers', module: 'customers' },
  { path: '/payments', label: 'Payments', module: 'payments' },
  { path: '/tables', label: 'Table Management', module: 'tables' },
  { path: '/staff', label: 'Staff', module: 'staff' },
];

const deliveryRouteDefinitions = [
  { path: '/dashboard', label: 'Dashboard', module: 'dashboard' },
  { path: '/orders', label: 'Assigned Orders', module: 'orders' },
];

export function canAccess(permissions, module, action = 'view') {
  return Boolean(permissions?.[module]?.includes(action));
}

export function getVisibleRoutes(role, permissions = {}) {
  const effectivePermissions = Object.keys(permissions).length
    ? permissions
    : (defaultPermissionsByRole[role] ?? {});
  const routes = role === 'delivery_boy' ? deliveryRouteDefinitions : routeDefinitions;

  return routes.filter((route) => canAccess(effectivePermissions, route.module));
}
