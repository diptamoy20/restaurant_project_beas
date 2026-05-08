import { api } from '../lib/api';

export const paymentApi = {
  async createRazorpayOrder(orderId) {
    return api.post('/payments/razorpay/order', { orderId });
  },

  async verifyRazorpayPayment(payload) {
    return api.post('/payments/razorpay/verify', payload);
  },

  async recordRazorpayFailure(payload) {
    return api.post('/payments/razorpay/failure', payload);
  },

  async confirmCodPayment(orderId) {
    return api.post('/payments/cod/confirm', { orderId });
  },
};
