export const ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED'] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  SERVED: 'Served',
};

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['CONFIRMED'],
  CONFIRMED: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['SERVED'],
  SERVED: [],
};
