import type { QRMenuItem } from '../types/menu.types';

const staticFallbacks = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
];

export function getMenuItemImage(item: QRMenuItem): string {
  if (item.imageUrl || item.image) {
    return item.imageUrl ?? item.image ?? staticFallbacks[0];
  }

  return staticFallbacks[item.id % staticFallbacks.length];
}
