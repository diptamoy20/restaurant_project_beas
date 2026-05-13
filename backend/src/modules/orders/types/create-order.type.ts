import { OrderSource } from '@prisma/client';

export type CreateOrderItemType = {
  menuItemId: number;

  variantId?: number;

  quantity: number;
};

export type CreateOrderType = {
  userId?: number;

  restaurantId: number;

  tableId?: number;

  addressId?: number;

  source: OrderSource;

  orderType: string;

  paymentMethod?: string;

  discountAmount?: number;

  items: CreateOrderItemType[];
};