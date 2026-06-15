export interface QRCreateOrderItem {
  menuItemId: number;
  variantId?: number;
  quantity: number;
  addons?: {
    addonGroupId: number;
    addonOptionId: number;
  }[];
}

export interface QRCreateOrderPayload {
  restaurantId: number;
  tableId: number;
  sessionId?: number;
  items: QRCreateOrderItem[];
  paymentMethod?: 'COD' | 'RAZORPAY';
}

export interface QRCreateOrderResponse {
  orderId: number;
  orderNumber: string;
  status: string;
  estimatedTime: number;
  finalAmount: number;
  subtotalAmount?: number;
  taxableAmount?: number;
  gstRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  taxAmount?: number;
}

export interface QRStoredOrderSuccess extends QRCreateOrderResponse {
  tableName?: string;
  restaurantName?: string;
}
