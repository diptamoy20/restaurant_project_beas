export interface QRMenuItemVariant {
  id: number;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface QRMenuAddonOption {
  id: number;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface QRMenuAddonGroup {
  id: number;
  name: string;
  selectionType: 'SINGLE' | 'MULTI';
  isRequired: boolean;
  minSelect?: number | null;
  maxSelect?: number | null;
  options: QRMenuAddonOption[];
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
  addonGroups?: QRMenuAddonGroup[];
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
