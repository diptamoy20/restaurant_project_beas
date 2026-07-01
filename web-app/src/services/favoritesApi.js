import { api } from '../lib/api';

export const favoritesApi = {
  /** GET /favorites — returns { success, total, data: MenuItem[] } */
  getFavorites() {
    return api.get('/favorites');
  },

  /** POST /favorites/:menuItemId */
  addFavorite(menuItemId) {
    return api.post(`/favorites/${menuItemId}`);
  },

  /** DELETE /favorites/:menuItemId */
  removeFavorite(menuItemId) {
    return api.delete(`/favorites/${menuItemId}`);
  },
};
