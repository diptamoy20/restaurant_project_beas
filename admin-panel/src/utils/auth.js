const AUTH_STORAGE_KEY = 'restaurant-admin-auth';

export const roleLabelMap = {
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
};

export const roleApiMap = {
  admin: 'admin',
  manager: 'manager',
  staff: 'delivery_boy',
};

export const defaultPermissionsByRole = {
  admin: {
    dashboard: ['view'],
    orders: ['view', 'accept', 'reject', 'complete'],
    restaurants: ['view', 'create', 'edit', 'delete'],
    categories: ['view', 'create', 'edit', 'delete'],
    customers: ['view'],
    payments: ['view', 'filter'],
    staff: ['view', 'create', 'edit', 'assign'],
  },
  manager: {
    dashboard: ['view'],
    orders: ['view', 'accept', 'reject'],
    restaurants: ['view', 'edit'],
    categories: ['view'],
    customers: ['view'],
    payments: ['view', 'filter'],
    staff: [],
  },
  staff: {
    dashboard: ['view'],
    orders: ['view'],
    restaurants: ['view'],
    categories: [],
    customers: [],
    payments: ['view'],
    staff: [],
  },
};

export function inferUiRole(rawRoles = []) {
  if (rawRoles.includes('admin')) {
    return 'admin';
  }

  if (rawRoles.includes('manager')) {
    return 'manager';
  }

  return 'staff';
}

export function normalizePermissions(rawPermissions, role) {
  const fallback = defaultPermissionsByRole[role] ?? {};

  if (!rawPermissions) {
    return fallback;
  }

  if (Array.isArray(rawPermissions)) {
    return rawPermissions.reduce((accumulator, value) => {
      const [module, action = 'view'] = String(value).split('.');
      if (!module) {
        return accumulator;
      }

      const existing = accumulator[module] ?? [];
      accumulator[module] = existing.includes(action) ? existing : [...existing, action];
      return accumulator;
    }, { ...fallback });
  }

  if (typeof rawPermissions === 'object') {
    return Object.entries(rawPermissions).reduce((accumulator, [module, actions]) => {
      if (Array.isArray(actions)) {
        accumulator[module] = actions;
      }

      return accumulator;
    }, { ...fallback });
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

