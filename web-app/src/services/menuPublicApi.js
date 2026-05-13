import { api } from '../lib/api';

export function getBestSellingMenu({ lat, lng, limit = 16, signal }) {
  const params = new URLSearchParams();

  if (lat !== undefined && lng !== undefined) {
    params.set('lat', String(lat));
    params.set('lng', String(lng));
  }

  params.set('limit', String(limit));

  return api.get(`/menu/best-selling?${params.toString()}`, { signal });
}
