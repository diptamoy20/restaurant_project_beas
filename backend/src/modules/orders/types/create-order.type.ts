import { OrderSource } from '@prisma/client';

export type CreateOrderItemType = {
  menuItemId: number;

  variantId?: number;

  quantity: number;

  addons?: {
    addonGroupId: number;
    addonOptionId: number;
  }[];
};

export type CreateOrderType = {
  userId?: number | null;

  restaurantId: number;

  tableId?: number;

  addressId?: number;

  source: OrderSource;

  orderType: string;

  paymentMethod?: string;

  discountAmount?: number;

  manualDiscountAmount?: number;

  couponCode?: string;

  items: CreateOrderItemType[];
};
