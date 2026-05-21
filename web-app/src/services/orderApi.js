import { api } from "../lib/api";

export const orderApi = {
  async createOrder(payload) {
    return api.post("/orders", payload);
  },

  async getOrder(orderId) {
    return api.get(`/orders/${orderId}`);
  },

  async getMyOrders() {
    const response = await api.get("/orders/my-orders");
    return Array.isArray(response) ? response : (response?.items ?? []);
  },
};
