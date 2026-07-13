import { Role } from '../enums/role.enum';

export type PermissionMap = Record<string, string[]>;

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<
  Role.ADMIN | Role.MANAGER | Role.DELIVERY_BOY | Role.POS_STAFF,
  PermissionMap
> = {
  [Role.ADMIN]: {
    dashboard: ['view'],
    orders: ['view', 'accept', 'reject', 'complete'],
    restaurants: ['view', 'create', 'edit', 'delete'],
    categories: ['view', 'create', 'edit', 'delete'],
    coupons: ['view', 'create', 'edit', 'delete'],
    customers: ['view'],
    payments: ['view', 'filter'],
    staff: ['view', 'create', 'edit', 'delete', 'assign'],
    tables: ['view', 'create', 'edit', 'delete', 'generate_qr'],
    pos: ['view', 'create_orders', 'update_orders', 'complete_orders'],
  },
  [Role.MANAGER]: {
    dashboard: ['view'],
    orders: ['view', 'accept', 'reject'],
    restaurants: ['view', 'edit'],
    categories: ['view'],
    coupons: ['view', 'create', 'edit'],
    customers: ['view'],
    payments: ['view', 'filter'],
    staff: [],
    tables: ['view', 'create', 'edit', 'generate_qr'],
    pos: ['view', 'create_orders', 'update_orders', 'complete_orders'],
  },
  [Role.DELIVERY_BOY]: {
    dashboard: ['view'],
    orders: ['view'],
    restaurants: [],
    categories: [],
    coupons: [],
    customers: [],
    payments: [],
    staff: [],
    tables: [],
  },
  [Role.POS_STAFF]: {
    dashboard: ['view'],
    orders: ['view', 'create', 'update'],
    restaurants: [],
    categories: ['view'],
    coupons: ['view'],
    customers: [],
    payments: ['view'],
    staff: [],
    tables: ['view'],
    pos: ['view', 'create_orders', 'update_orders', 'complete_orders'],
  },
};

export function getDefaultPermissionsForRoles(roles: Role[]): PermissionMap {
  if (roles.includes(Role.ADMIN)) {
    return DEFAULT_PERMISSIONS_BY_ROLE[Role.ADMIN];
  }

  if (roles.includes(Role.MANAGER)) {
    return DEFAULT_PERMISSIONS_BY_ROLE[Role.MANAGER];
  }

  if (roles.includes(Role.DELIVERY_BOY)) {
    return DEFAULT_PERMISSIONS_BY_ROLE[Role.DELIVERY_BOY];
  }

  if (roles.includes(Role.POS_STAFF)) {
    return DEFAULT_PERMISSIONS_BY_ROLE[Role.POS_STAFF];
  }

  return {};
}
