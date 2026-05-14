export interface QRCreateOrderItem {
  menuItemId: number;
  variantId?: number;
  quantity: number;
}

export interface QRCreateOrderPayload {
  restaurantId: number;
  tableId: number;
  items: QRCreateOrderItem[];
  paymentMethod?: 'COD' | 'RAZORPAY';
}

export interface QRCreateOrderResponse {
  orderId: number;
  orderNumber: string;
  status: string;
  estimatedTime: number;
  finalAmount: number;
}

export interface QRStoredOrderSuccess extends QRCreateOrderResponse {
  tableName?: string;
  restaurantName?: string;
}
