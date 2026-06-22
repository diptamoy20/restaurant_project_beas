import { api } from '../lib/api';

export const cartApi = {
  async getCart() {
    return api.get('/carts');
  },

  async addToCart(payload) {
    return api.post('/carts', payload);
  },

async updateCartItem(cartItemId, payload) {
  return api.put(`/carts/${cartItemId}`, payload);
},

  async removeFromCart(cartItemId) {
    return api.delete(`/carts/${cartItemId}`);
  },

  async clearCart() {
    return api.delete('/carts');
  },
};
