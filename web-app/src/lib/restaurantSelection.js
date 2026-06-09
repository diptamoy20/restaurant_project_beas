function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export function distanceKm(origin, restaurant) {
  if (!origin || restaurant?.latitude == null || restaurant?.longitude == null) {
    return 0;
  }

  const R = 6371;
  const dLat = deg2rad(restaurant.latitude - origin.lat);
  const dLon = deg2rad(restaurant.longitude - origin.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(origin.lat)) *
      Math.cos(deg2rad(restaurant.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function getRestaurantIdFromUrl(search) {
  const params = new URLSearchParams(search);
  return params.get('restaurantId') || params.get('restaurant') || null;
}

export function getNearestRestaurant(restaurants, location) {
  if (!restaurants?.length) {
    return null;
  }

  const list = [...restaurants];

  if (location?.lat != null && location?.lng != null) {
    list.sort((a, b) => distanceKm(location, a) - distanceKm(location, b));
  }

  return list[0] ?? null;
}

export function getNearestRestaurantId(restaurants, location) {
  return getNearestRestaurant(restaurants, location)?.id ?? null;
}

export function resolveMenuRestaurantId({
  urlRestaurantId,
  selectedRestaurantId,
  nearbyRestaurants,
  location,
}) {
  if (urlRestaurantId) {
    const parsed = Number(urlRestaurantId);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (selectedRestaurantId != null) {
    return Number(selectedRestaurantId);
  }

  return getNearestRestaurantId(nearbyRestaurants, location);
}
