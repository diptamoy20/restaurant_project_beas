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
  const legacyValue = params.get('restaurant') || params.get('restaurantId');

  if (legacyValue && /^\d+$/.test(String(legacyValue))) {
    return legacyValue;
  }

  return getPersistedRestaurantId() || '';
}

export function createTableAwarePath(path, tableId) {
  return path;
}

export function createSessionAwarePath(path, tableId) {
  if (!tableId) {
    return path;
  }

  const params = new URLSearchParams();
  params.set('table', String(tableId));

  return `${path}?${params.toString()}`;
}
