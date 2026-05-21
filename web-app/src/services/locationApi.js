import { api } from "../lib/api";

export function searchRestaurants({ q, lat, lng, signal }) {
  const params = new URLSearchParams({ q });

  if (lat !== undefined && lng !== undefined) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }

  return api.get(`/restaurants/search?${params.toString()}`, { signal });
}

export function getNearbyRestaurants({
  lat,
  lng,
  radiusKm = 10,
  limit = 20,
  offset = 0,
  signal,
}) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radiusKm: String(radiusKm),
    limit: String(limit),
    offset: String(offset),
  });

  return api.get(`/v1/restaurants/nearby?${params.toString()}`, { signal });
}

export function getRestaurantMenuWithLocation({
  restaurantId,
  lat,
  lng,
  categoryId,
  limit,
  offset,
  signal,
}) {
  const params = new URLSearchParams();

  if (lat !== undefined && lng !== undefined) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }

  if (categoryId !== undefined) {
    params.set("categoryId", String(categoryId));
  }

  if (limit !== undefined) {
    params.set("limit", String(limit));
  }

  if (offset !== undefined) {
    params.set("offset", String(offset));
  }

  const query = params.toString();

  return api.get(
    `/v1/restaurants/${restaurantId}/menu${query ? `?${query}` : ""}`,
    { signal },
  );
}

export function validateAddress({ lat, lng, restaurantId }) {
  return api.post("/v1/address/validate", {
    lat,
    lng,
    ...(restaurantId && { restaurantId }),
  });
}
