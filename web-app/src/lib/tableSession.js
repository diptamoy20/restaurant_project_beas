const TABLE_STORAGE_KEY = 'restaurant-web-active-table';

export function persistTableId(tableId) {
  if (!tableId) {
    return;
  }

  sessionStorage.setItem(TABLE_STORAGE_KEY, String(tableId));
}

export function getPersistedTableId() {
  return sessionStorage.getItem(TABLE_STORAGE_KEY);
}

export function resolveTableId(search) {
  const params = new URLSearchParams(search);
  return params.get('table') || getPersistedTableId() || '';
}

export function createTableAwarePath(path, tableId) {
  return tableId ? `${path}?table=${tableId}` : path;
}
