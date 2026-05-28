export const DELIVERY_STATUS = {
  ASSIGNED: 'ASSIGNED',
  ON_THE_WAY: 'ON_THE_WAY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export type DeliveryStatusValue = (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];

export const ACTIVE_DELIVERY_STATUSES: DeliveryStatusValue[] = [
  DELIVERY_STATUS.ASSIGNED,
  DELIVERY_STATUS.ON_THE_WAY,
];
