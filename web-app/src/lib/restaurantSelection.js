import { getPersistedRestaurantSlug } from './restaurantPaths';
import { getPersistedRestaurantId } from './tableSession';

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
  const legacyValue = params.get('restaurantId') || params.get('restaurant');

  if (legacyValue && /^\d+$/.test(String(legacyValue))) {
    return legacyValue;
  }

  return null;
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

export function getNearestRestaurantSlug(restaurants, location) {
  return getNearestRestaurant(restaurants, location)?.slug ?? null;
}

export function resolveMenuRestaurant({
  urlRestaurantId,
  urlRestaurantSlug,
  selectedRestaurantId,
  selectedRestaurantSlug,
  nearbyRestaurants,
  location,
}) {
  if (urlRestaurantSlug) {
    const match = nearbyRestaurants?.find(
      (restaurant) => restaurant.slug === urlRestaurantSlug,
    );

    return {
      id: match?.id ?? selectedRestaurantId ?? null,
      slug: urlRestaurantSlug,
    };
  }

  if (urlRestaurantId) {
    const parsed = Number(urlRestaurantId);
    const match = nearbyRestaurants?.find(
      (restaurant) => Number(restaurant.id) === parsed,
    );

    return {
      id: Number.isNaN(parsed) ? null : parsed,
      slug: match?.slug ?? selectedRestaurantSlug ?? null,
    };
  }

  if (selectedRestaurantSlug) {
    return {
      id: selectedRestaurantId ?? null,
      slug: selectedRestaurantSlug,
    };
  }

  if (selectedRestaurantId != null) {
    const match = nearbyRestaurants?.find(
      (restaurant) => Number(restaurant.id) === Number(selectedRestaurantId),
    );

    return {
      id: Number(selectedRestaurantId),
      slug: match?.slug ?? (getPersistedRestaurantSlug() || null),
    };
  }

  const nearest = getNearestRestaurant(nearbyRestaurants, location);

  return {
    id: nearest?.id ?? null,
    slug: nearest?.slug ?? null,
  };
}

export function resolveMenuRestaurantId(args) {
  return resolveMenuRestaurant(args).id;
}
