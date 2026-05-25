import { api } from '../lib/api';

export const checkoutApi = {
  getQuote(payload) {
    return api.post('/checkout/quote', payload);
  },
  getCoupons(params = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value));
      }
    });

    return api.get(`/checkout/coupons${query.toString() ? `?${query.toString()}` : ''}`);
  },
};
