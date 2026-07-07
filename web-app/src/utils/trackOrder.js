const TRACKABLE_ORDER_STATUSES = ["ACCEPTED", "PREPARING", "ON_THE_WAY"];

export const TIMELINE_STAGES = [
  { key: "ACCEPTED", label: "Accepted" },
  { key: "PREPARING", label: "Preparing" },
  { key: "ON_THE_WAY", label: "On The Way" },
  { key: "DELIVERED", label: "Delivered" },
];

const STATUS_SEQUENCE = TIMELINE_STAGES.map((stage) => stage.key);

const LIVE_STATUS_COPY = {
  ACCEPTED: "Order accepted by the restaurant",
  PREPARING: "Your order is being prepared",
  ON_THE_WAY: "Your order is on the way",
  DELIVERED: "Your order has been delivered",
  PENDING: "Waiting for restaurant confirmation",
  PAYMENT_PENDING: "Waiting for payment confirmation",
};

export function isOrderTrackable(order) {
  if (!order || order.orderType !== "DELIVERY") {
    return false;
  }

  if (order.status === "CANCELLED" || order.status === "DELIVERED") {
    return false;
  }

  return TRACKABLE_ORDER_STATUSES.includes(order.status);
}

export function resolveOrderStatus(tracking, fallbackOrder) {
  return (
    tracking?.order?.status ??
    fallbackOrder?.status ??
    tracking?.status ??
    "PENDING"
  );
}

export function isValidCoordinate(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function toCoordinates(location) {
  if (!location || !isValidCoordinate(location.latitude, location.longitude)) {
    return null;
  }

  return [Number(location.longitude), Number(location.latitude)];
}

export function resolveRestaurantLocation(tracking) {
  const restaurant = tracking?.restaurant;

  if (restaurant && isValidCoordinate(restaurant.latitude, restaurant.longitude)) {
    return restaurant;
  }

  return null;
}

/**
 * Raw latestLocation from tracking payload (API or socket).
 * Prefer `driverLocation` from `useDeliveryTracking` for map rendering.
 */
export function resolveMarkerLocation(tracking) {
  const latest = tracking?.latestLocation;

  if (latest && isValidCoordinate(latest.latitude, latest.longitude)) {
    return latest;
  }

  return null;
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

export function shouldDrawDeliveryRoute(orderStatus) {
  return orderStatus === "ON_THE_WAY";
}

export function getTimelineStageState(orderStatus, stageKey) {
  const currentIndex = STATUS_SEQUENCE.indexOf(orderStatus);
  const stageIndex = STATUS_SEQUENCE.indexOf(stageKey);

  if (currentIndex < 0 || stageIndex < 0) {
    return "pending";
  }

  if (stageIndex < currentIndex) {
    return "completed";
  }

  if (stageIndex === currentIndex) {
    return orderStatus === "DELIVERED" ? "completed" : "active";
  }

  return "pending";
}

export function getLiveStatusMessage(orderStatus) {
  return LIVE_STATUS_COPY[orderStatus] ?? "Tracking your order";
}

export function mergeTrackingSocketUpdate(tracking, payload) {
  if (!tracking || !payload) {
    return tracking;
  }

  const nextOrder = payload.order
    ? {
        ...tracking.order,
        ...payload.order,
        itemsSummary: tracking.order?.itemsSummary ?? payload.order?.itemsSummary,
        items: tracking.order?.items ?? payload.order?.items,
      }
    : tracking.order;

  let nextLatestLocation = tracking.latestLocation;

  if (
    payload.latestLocation &&
    isValidCoordinate(payload.latestLocation.latitude, payload.latestLocation.longitude) &&
    isNewerOrEqualLocation(tracking.latestLocation, payload.latestLocation)
  ) {
    nextLatestLocation = payload.latestLocation;
  }

  return {
    ...tracking,
    status: payload.status ?? tracking.status,
    latestLocation: nextLatestLocation,
    order: nextOrder,
    restaurant: tracking.restaurant,
    customer: tracking.customer,
    agent: tracking.agent,
    trackingHistory: tracking.trackingHistory,
  };
}
