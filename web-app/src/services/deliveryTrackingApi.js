import { api } from "../lib/api";

export const deliveryTrackingApi = {
  async getTracking(orderId) {
    return api.get(`/deliveries/order/${orderId}/track`);
  },
};
