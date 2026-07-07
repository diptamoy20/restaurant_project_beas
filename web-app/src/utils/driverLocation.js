import { isValidCoordinate } from "./trackOrder";

const COORDINATE_EPSILON = 1e-6;

export function areCoordinatesEqual(left, right) {
  if (!left || !right) {
    return false;
  }

  const leftLat = Number(left.latitude);
  const leftLng = Number(left.longitude);
  const rightLat = Number(right.latitude);
  const rightLng = Number(right.longitude);

  return (
    Math.abs(leftLat - rightLat) < COORDINATE_EPSILON &&
    Math.abs(leftLng - rightLng) < COORDINATE_EPSILON
  );
}

function isNewerOrEqualLocation(current, incoming) {
  if (!incoming) {
    return false;
  }

  if (!current) {
    return true;
  }

  const incomingTime = Date.parse(incoming.recordedAt);
  const currentTime = Date.parse(current.recordedAt);

  if (Number.isFinite(incomingTime) && Number.isFinite(currentTime)) {
    return incomingTime >= currentTime;
  }

  return true;
}

export function isLiveDriverGpsLocation(location) {
  return (
    Boolean(location) &&
    isValidCoordinate(location.latitude, location.longitude) &&
    location.source !== "restaurant"
  );
}

/**
 * Merges a live driver GPS update while ignoring stale or duplicate coordinates.
 */
export function mergeDriverLocation(current, incoming) {
  if (!incoming || !isValidCoordinate(incoming.latitude, incoming.longitude)) {
    return current ?? null;
  }

  if (incoming.source === "restaurant") {
    return current ?? null;
  }

  if (current && areCoordinatesEqual(current, incoming)) {
    return current;
  }

  if (current && !isNewerOrEqualLocation(current, incoming)) {
    return current;
  }

  return incoming;
}

export function createRestaurantDriverPlaceholder(restaurant) {
  if (!restaurant || !isValidCoordinate(restaurant.latitude, restaurant.longitude)) {
    return null;
  }

  return {
    latitude: Number(restaurant.latitude),
    longitude: Number(restaurant.longitude),
    source: "restaurant",
    heading: null,
    speed: null,
    recordedAt: null,
  };
}

/**
 * Resolves map marker position for the rider during ON_THE_WAY.
 * Before live GPS: driver marker sits at the restaurant.
 * After live GPS: driver marker follows socket coordinates.
 */
export function resolveRiderMarkerLocation({
  driverLocation,
  hasLiveDriverGps,
  orderStatus,
  restaurant,
}) {
  if (orderStatus !== "ON_THE_WAY" && orderStatus !== "DELIVERED") {
    return null;
  }

  if (hasLiveDriverGps && isLiveDriverGpsLocation(driverLocation)) {
    return driverLocation;
  }

  if (orderStatus === "ON_THE_WAY") {
    return createRestaurantDriverPlaceholder(restaurant);
  }

  return isLiveDriverGpsLocation(driverLocation) ? driverLocation : null;
}

/**
 * Resolves the route origin while the order is ON_THE_WAY.
 * Before live GPS: restaurant → customer.
 * After live GPS: driver current position → customer.
 */
export function resolveRouteOrigin({
  driverLocation,
  hasLiveDriverGps,
  orderStatus,
  restaurant,
}) {
  if (orderStatus !== "ON_THE_WAY") {
    return null;
  }

  if (hasLiveDriverGps && isLiveDriverGpsLocation(driverLocation)) {
    return driverLocation;
  }

  return createRestaurantDriverPlaceholder(restaurant);
}
