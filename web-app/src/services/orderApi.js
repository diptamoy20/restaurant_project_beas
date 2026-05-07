import { api } from '../lib/api';

export const orderApi = {
  async createOrder(payload) {
    return api.post('/orders', payload);
  },

  async getOrder(orderId) {
    return api.get(`/orders/${orderId}`);
  },
};
