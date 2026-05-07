import { api } from '../lib/api';

export const orderApi = {
  async createOrder(payload) {
    return api.post('/api/orders', payload);
  },

  async getOrder(orderId) {
    return api.get(`/api/orders/${orderId}`);
  },
};
