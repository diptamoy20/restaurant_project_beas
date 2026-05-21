import { api } from "../lib/api";

export function getBestSellingMenu({
  lat,
  lng,
  limit = 16,
  categoryId,
  restaurantId,
  signal,
}) {
  const params = new URLSearchParams();

  if (lat !== undefined && lng !== undefined) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }

  params.set("limit", String(limit));

  if (categoryId !== undefined) {
    params.set("categoryId", String(categoryId));
  }

  if (restaurantId !== undefined) {
    params.set("restaurantId", String(restaurantId));
  }

  return api.get(`/menu/best-selling?${params.toString()}`, { signal });
}
