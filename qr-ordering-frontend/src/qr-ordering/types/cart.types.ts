import type { AddOnIngredient } from './addOn.types';
import type { QRMenuItem, QRMenuItemVariant, QRRestaurantInfo } from './menu.types';

export interface CartItem {
  cartKey: string;
  menuItemId: number;
  name: string;
  description?: string | null;
  image?: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  variant?: QRMenuItemVariant;
  addOns: AddOnIngredient[];
  preparationTime?: number;
}

export interface CartSnapshot {
  items: CartItem[];
  restaurant?: QRRestaurantInfo;
  restaurantId?: number;
  tableId?: number;
  tableLabel?: string;
}

export interface CartContextValue extends CartSnapshot {
  itemCount: number;
  subtotal: number;
  total: number;
  addItem: (
    item: QRMenuItem,
    options?: {
      variant?: QRMenuItemVariant;
      addOns?: AddOnIngredient[];
      quantity?: number;
    },
  ) => void;
  removeItem: (cartKey: string) => void;
  increaseQuantity: (cartKey: string) => void;
  decreaseQuantity: (cartKey: string) => void;
  clearCart: () => void;
  setOrderContext: (context: {
    restaurant: QRRestaurantInfo;
    restaurantId: number;
    tableId: number;
    tableLabel: string;
  }) => void;
  getQuantity: (menuItemId: number, variantId?: number) => number;
}
