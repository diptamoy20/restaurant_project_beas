const TABLE_STORAGE_KEY = 'restaurant-web-active-table';
const RESTAURANT_STORAGE_KEY = 'restaurant-web-active-restaurant';

export function persistTableId(tableId) {
  if (!tableId) {
    return;
  }

  sessionStorage.setItem(TABLE_STORAGE_KEY, String(tableId));
}

export function getPersistedTableId() {
  return sessionStorage.getItem(TABLE_STORAGE_KEY);
}

export function persistRestaurantId(restaurantId) {
  if (!restaurantId) {
    return;
  }

  sessionStorage.setItem(RESTAURANT_STORAGE_KEY, String(restaurantId));
}

export function getPersistedRestaurantId() {
  return sessionStorage.getItem(RESTAURANT_STORAGE_KEY);
}

export function resolveTableId(search) {
  const params = new URLSearchParams(search);
  return params.get('table') || getPersistedTableId() || '';
}

export function resolveRestaurantId(search) {
  const params = new URLSearchParams(search);
  return params.get('restaurant') || getPersistedRestaurantId() || '';
}

export function createTableAwarePath(path, tableId) {
  if (!tableId) {
    return path;
  }

  return `${path}?table=${tableId}`;
}

export function createSessionAwarePath(path, tableId, restaurantId) {
  const params = new URLSearchParams();

  if (tableId) {
    params.set('table', String(tableId));
  }

  if (restaurantId) {
    params.set('restaurant', String(restaurantId));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
