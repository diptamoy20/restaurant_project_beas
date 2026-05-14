export interface QRMenuItemVariant {
  id: number;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface QRMenuItem {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  image?: string;
  imageUrl?: string;
  isAvailable: boolean;
  preparationTime?: number;
  categoryId: number;
  variants?: QRMenuItemVariant[];
}

export interface QRMenuCategory {
  id: number;
  name: string;
  description?: string | null;
  items: QRMenuItem[];
}

export interface QRRestaurantInfo {
  id: number;
  name: string;
  description?: string | null;
  tableId: number;
  tableName: string;
}

export interface QRMenuResponse {
  restaurant: QRRestaurantInfo;
  categories: QRMenuCategory[];
}
