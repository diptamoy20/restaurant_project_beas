import { Role } from '../enums/role.enum';

export type PermissionMap = Record<string, string[]>;

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<
  Role.ADMIN | Role.MANAGER | Role.DELIVERY_BOY,
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

  return {};
}
