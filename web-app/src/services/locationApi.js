import { api } from "../lib/api";

export function getNearbyRestaurants({
  lat,
  lng,
  radiusKm = 10,
  page = 1,
  limit = 20,
  signal,
}) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radiusKm: String(radiusKm),
    page: String(page),
    limit: String(limit),
  });

  return api.get(`/v1/restaurants/nearby?${params.toString()}`, { signal });
}

export function getRestaurantMenuWithLocation({
  restaurantId,
  lat,
  lng,
  signal,
}) {
  const params = new URLSearchParams();

  if (lat !== undefined && lng !== undefined) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
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
