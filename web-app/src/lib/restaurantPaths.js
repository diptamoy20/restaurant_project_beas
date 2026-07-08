const RESTAURANT_SLUG_STORAGE_KEY = 'restaurant-web-active-restaurant-slug';

export function persistRestaurantSlug(slug) {
  if (!slug) {
    return;
  }

  sessionStorage.setItem(RESTAURANT_SLUG_STORAGE_KEY, String(slug));
}

export function getPersistedRestaurantSlug() {
  return sessionStorage.getItem(RESTAURANT_SLUG_STORAGE_KEY) || '';
}

export function isMenuPath(pathname) {
  return pathname === '/menu' || /^\/menu\/[^/]+$/.test(pathname);
}

export function getRestaurantSlugFromPath(pathname) {
  const match = pathname.match(/^\/menu\/([^/]+)$/);
  return match?.[1] ?? null;
}

export function buildMenuPath(slug, { tableId } = {}) {
  if (!slug) {
    return '/menu';
  }

  const params = new URLSearchParams();

  if (tableId) {
    params.set('table', String(tableId));
  }

  const query = params.toString();
  const path = `/menu/${slug}`;

  return query ? `${path}?${query}` : path;
}

export function buildSessionAwarePath(path, { tableId } = {}) {
  if (!tableId) {
    return path;
  }

  const params = new URLSearchParams();
  params.set('table', String(tableId));

  return `${path}?${params.toString()}`;
}

export function isLegacyRestaurantIdParam(value) {
  return Boolean(value) && /^\d+$/.test(String(value));
}
