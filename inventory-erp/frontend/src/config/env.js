function normalizeUrl(value) {
  return String(value ?? '').trim().replace(/\/$/, '');
}

export function getApiBaseUrl() {
  if (import.meta.env.DEV) {
    return normalizeUrl(
      import.meta.env.VITE_DEV_API_BASE_URL || 'http://localhost:4001/api',
    );
  }

  return normalizeUrl(
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api',
  );
}
