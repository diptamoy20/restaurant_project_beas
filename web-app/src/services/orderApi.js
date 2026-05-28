import { api } from "../lib/api";
import { loadUserFromStorage } from "./authStorage";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api"
).replace(/\/$/, "");

function getStoredToken() {
  return loadUserFromStorage()?.token ?? null;
}

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

  async getInvoice(orderId) {
    return api.get(`/orders/${orderId}/invoice`);
  },

  async downloadInvoice(orderId) {
    const token = getStoredToken();
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/invoice/download`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "X-Client-Type": "web",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Invoice download failed");
    }

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="([^"]+)"/);
    const fileName = match?.[1] || `invoice-${orderId}.pdf`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
