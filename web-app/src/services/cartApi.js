import { api } from '../lib/api';

export const cartApi = {
  async getCart() {
    return api.get('/carts');
  },

  async addToCart(payload) {
    return api.post('/carts', payload);
  },

  async updateCartItem(menuItemId, payload) {
    return api.put(`/carts/${menuItemId}`, payload);
  },

  async removeFromCart(menuItemId) {
    return api.request(`/carts/${menuItemId}`, {
      method: 'DELETE',
    });
  },

  async clearCart() {
    return api.request('/carts', {
      method: 'DELETE',
    });
  },
};
