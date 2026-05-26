const AUTH_STORAGE_KEY = 'restaurant-admin-auth';

export const roleLabelMap = {
  admin: 'Admin',
  manager: 'Manager',
  delivery_boy: 'Delivery Boy',
};

export const roleApiMap = {
  admin: 'admin',
  manager: 'manager',
  delivery_boy: 'delivery_boy',
};

export const defaultPermissionsByRole = {
  admin: {
    dashboard: ['view'],
    orders: ['view', 'accept', 'reject', 'complete'],
    restaurants: ['view', 'create', 'edit', 'delete'],
    categories: ['view', 'create', 'edit', 'delete'],
    coupons: ['view', 'create', 'edit', 'delete'],
    customers: ['view'],
    payments: ['view', 'filter'],
    staff: ['view', 'create', 'edit', 'delete', 'assign'],
  },
  manager: {
    dashboard: ['view'],
    orders: ['view', 'accept', 'reject'],
    restaurants: ['view', 'edit'],
    categories: ['view'],
    coupons: ['view', 'create', 'edit'],
    customers: ['view'],
    payments: ['view', 'filter'],
    staff: [],
  },
  delivery_boy: {
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

export function inferUiRole(rawRole = 'delivery_boy') {
  const roles = Array.isArray(rawRole) ? rawRole : [rawRole];

  if (roles.includes('admin')) {
    return 'admin';
  }

  if (roles.includes('manager')) {
    return 'manager';
  }

  return 'delivery_boy';
}

export function hasBackendRole(user, role) {
  return user?.role === role;
}

export function normalizePersistedRole(role) {
  return role === 'delivery' ? 'delivery_boy' : role;
}

export function normalizePermissions(rawPermissions, role) {
  const fallback = defaultPermissionsByRole[role] ?? {};

  if (!rawPermissions) {
    return fallback;
  }

  if (Array.isArray(rawPermissions)) {
    return rawPermissions.reduce(
      (accumulator, value) => {
        const [module, action = 'view'] = String(value).split('.');
        if (!module) {
          return accumulator;
        }

        const existing = accumulator[module] ?? [];
        accumulator[module] = existing.includes(action) ? existing : [...existing, action];
        return accumulator;
      },
      { ...fallback },
    );
  }

  if (typeof rawPermissions === 'object') {
    return Object.entries(rawPermissions).reduce(
      (accumulator, [module, actions]) => {
        if (Array.isArray(actions)) {
          accumulator[module] = actions;
        }

        return accumulator;
      },
      { ...fallback },
    );
  }

  return fallback;
}

export function loadPersistedAuth() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function persistAuthState(state) {
  const snapshot = {
    token: state.token,
    user: state.user,
    role: state.role,
    permissions: state.permissions,
  };

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearPersistedAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getInitials(name = '', email = '') {
  const source = name || email || 'Admin User';
  const tokens = source.trim().split(/\s+/).slice(0, 2);
  return tokens.map((token) => token[0]?.toUpperCase() ?? '').join('') || 'AU';
}
