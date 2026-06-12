export type DeliveryFeeConfig = {
  deliveryEnabled: boolean;
  deliveryRadiusKm: number;
  deliveryBaseFee: number;
  deliveryBaseDistanceKm: number;
  deliveryPerKmFee: number;
  deliveryFeeMin: number | null;
  deliveryFeeCap: number | null;
  freeDeliveryMinAmount: number | null;
  packagingCharge: number;
};

export type DeliveryFeeBreakdown = {
  distanceKm: number | null;
  baseFee: number;
  baseDistanceKm: number;
  extraDistanceKm: number;
  extraUnits: number;
  perKmFee: number;
  deliveryCharge: number;
  packagingCharge: number;
  freeDeliveryApplied: boolean;
  freeDeliveryMinAmount: number | null;
};

export type DeliveryFeeResult = {
  isDeliveryAvailable: boolean;
  deliveryCharge: number;
  packagingCharge: number;
  deliveryDistanceKm: number | null;
  deliveryUnavailableReason: string | null;
  deliveryFeeBreakdown: DeliveryFeeBreakdown;
};

export function calculateDistanceKm(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const fromLatitudeRadians = toRadians(fromLatitude);
  const toLatitudeRadians = toRadians(toLatitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitudeRadians) * Math.cos(toLatitudeRadians) * Math.sin(longitudeDelta / 2) ** 2;
  const distance = earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return roundMoney(distance);
}

export function calculateDeliveryFee(
  config: DeliveryFeeConfig,
  distanceKm: number | null,
  subtotalAmount: number,
): DeliveryFeeResult {
  const packagingCharge = roundMoney(config.packagingCharge);
  const breakdownBase = {
    distanceKm,
    baseFee: roundMoney(config.deliveryBaseFee),
    baseDistanceKm: roundMoney(config.deliveryBaseDistanceKm),
    extraDistanceKm: 0,
    extraUnits: 0,
    perKmFee: roundMoney(config.deliveryPerKmFee),
    deliveryCharge: 0,
    packagingCharge,
    freeDeliveryApplied: false,
    freeDeliveryMinAmount: config.freeDeliveryMinAmount,
  };

  if (!config.deliveryEnabled) {
    return {
      isDeliveryAvailable: false,
      deliveryCharge: 0,
      packagingCharge: 0,
      deliveryDistanceKm: distanceKm,
      deliveryUnavailableReason: 'Delivery is disabled for this restaurant',
      deliveryFeeBreakdown: breakdownBase,
    };
  }

  if (distanceKm === null || !Number.isFinite(distanceKm)) {
    return {
      isDeliveryAvailable: false,
      deliveryCharge: 0,
      packagingCharge: 0,
      deliveryDistanceKm: null,
      deliveryUnavailableReason: 'Delivery distance could not be calculated',
      deliveryFeeBreakdown: breakdownBase,
    };
  }

  const freeDeliveryApplied =
    config.freeDeliveryMinAmount !== null &&
    config.freeDeliveryMinAmount !== undefined &&
    subtotalAmount >= config.freeDeliveryMinAmount;
  const extraDistanceKm = Math.max(0, distanceKm - config.deliveryBaseDistanceKm);
  const extraUnits = roundMoney(extraDistanceKm);
  let deliveryCharge = freeDeliveryApplied
    ? 0
    : extraDistanceKm <= 0
      ? 0
      : config.deliveryBaseFee + extraDistanceKm * config.deliveryPerKmFee;

  if (
    !freeDeliveryApplied &&
    config.deliveryFeeMin !== null &&
    config.deliveryFeeMin !== undefined
  ) {
    deliveryCharge = Math.max(deliveryCharge, config.deliveryFeeMin);
  }

  if (
    !freeDeliveryApplied &&
    config.deliveryFeeCap !== null &&
    config.deliveryFeeCap !== undefined
  ) {
    deliveryCharge = Math.min(deliveryCharge, config.deliveryFeeCap);
  }

  deliveryCharge = roundMoney(deliveryCharge);

  return {
    isDeliveryAvailable: true,
    deliveryCharge,
    packagingCharge,
    deliveryDistanceKm: distanceKm,
    deliveryUnavailableReason: null,
    deliveryFeeBreakdown: {
      ...breakdownBase,
      extraDistanceKm: roundMoney(extraDistanceKm),
      extraUnits,
      deliveryCharge,
      freeDeliveryApplied,
    },
  };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
