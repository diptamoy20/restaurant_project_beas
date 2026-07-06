import { io } from "socket.io-client";

import {
  isTrackingSocketDebugEnabled,
  resolveTrackingSocketSource,
  resolveTrackingSocketUrl,
} from "../config/trackingSocket";
import { loadUserFromStorage } from "./authStorage";

function resolveAccessToken() {
  const token = loadUserFromStorage()?.token ?? null;

  if (!token || token === "undefined" || token === "null") {
    return null;
  }

  return token.trim();
}

class DeliveryTrackingSocketManager {
  constructor() {
    this.socket = null;
    this.lastSocketUrl = null;
    this.subscriptions = new Map();
    this.joinedRooms = new Set();
    this.globalHandlersAttached = false;
    this.connectionListeners = new Set();
  }

  ensureConnected() {
    const token = resolveAccessToken();

    if (!token) {
      throw new Error("Sign in again to track your delivery.");
    }

    if (this.socket?.connected) {
      return this.socket;
    }

    if (!this.socket) {
      const socketUrl = resolveTrackingSocketUrl();

      if (isTrackingSocketDebugEnabled()) {
        console.info("[tracking] connecting to", socketUrl, {
          source: resolveTrackingSocketSource(),
          mode: import.meta.env.MODE,
        });
      }

      this.lastSocketUrl = socketUrl;

      this.socket = io(socketUrl, {
        autoConnect: false,
        transports: ["polling", "websocket"],
        path: "/socket.io",
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1500,
        timeout: 45_000,
        auth: { token },
      });

      this.attachGlobalHandlers();
    } else {
      this.socket.auth = { token };
    }

    if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
  }

  attachGlobalHandlers() {
    if (!this.socket || this.globalHandlersAttached) {
      return;
    }

    this.globalHandlersAttached = true;

    this.socket.on("connect", () => {
      this.notifyConnection("connected");
      this.rejoinActiveRooms();
    });

    this.socket.on("disconnect", (reason) => {
      this.notifyConnection("disconnected", reason);
    });

    this.socket.on("connect_error", (error) => {
      const message = error?.message ?? "Connection failed";

      console.error("[tracking] connection failed", {
        url: this.lastSocketUrl ?? resolveTrackingSocketUrl(),
        source: resolveTrackingSocketSource(),
        message,
      });

      this.notifyConnection("error", message);
    });

    this.socket.on("tracking:connected", () => {
      this.notifyConnection("ready");
      this.rejoinActiveRooms();
    });

    this.socket.on("tracking:snapshot", (snapshot) => {
      const orderId = snapshot?.order?.id;
      if (orderId != null) {
        this.dispatch(orderId, "onSnapshot", snapshot);
      }
    });

    this.socket.on("order:updated", (payload) => {
      const orderId = payload?.order?.id;
      if (orderId != null) {
        this.dispatch(orderId, "onOrderUpdated", payload);
      }
    });

    this.socket.on("tracking:error", (payload) => {
      this.notifyConnection("error", payload?.message ?? "Tracking error");
      this.subscriptions.forEach((listeners) => {
        listeners.forEach((listener) => {
          listener.onError?.(payload?.message ?? "Tracking error");
        });
      });
    });
  }

  rejoinActiveRooms() {
    if (!this.socket?.connected) {
      return;
    }

    this.joinedRooms.forEach((orderId) => {
      this.emitTrackJoin(orderId);
    });
  }

  emitTrackJoin(orderId) {
    if (!this.socket?.connected) {
      return;
    }

    const numericOrderId = Number(orderId);

    this.socket.emit("track:join", { orderId: numericOrderId }, (snapshot) => {
      if (snapshot?.order?.id != null) {
        this.dispatch(snapshot.order.id, "onSnapshot", snapshot);
      }
    });
  }

  dispatch(orderId, eventName, payload) {
    const listeners = this.subscriptions.get(String(orderId));
    if (!listeners) {
      return;
    }

    listeners.forEach((listener) => {
      listener[eventName]?.(payload);
    });
  }

  notifyConnection(state, detail) {
    this.connectionListeners.forEach((listener) => {
      listener(state, detail);
    });

    this.subscriptions.forEach((listeners) => {
      listeners.forEach((listener) => {
        listener.onConnectionChange?.(state, detail);
      });
    });
  }

  subscribe(orderId, listener) {
    const roomKey = String(orderId);

    if (!this.subscriptions.has(roomKey)) {
      this.subscriptions.set(roomKey, new Set());
    }

    this.subscriptions.get(roomKey).add(listener);

    const socket = this.ensureConnected();

    if (!this.joinedRooms.has(roomKey)) {
      this.joinedRooms.add(roomKey);
    }

    if (socket.connected) {
      this.emitTrackJoin(orderId);
    }

    return () => this.unsubscribe(orderId, listener);
  }

  unsubscribe(orderId, listener) {
    const roomKey = String(orderId);
    const listeners = this.subscriptions.get(roomKey);

    if (!listeners) {
      return;
    }

    listeners.delete(listener);

    if (listeners.size === 0) {
      this.subscriptions.delete(roomKey);
      this.joinedRooms.delete(roomKey);
    }

    if (this.subscriptions.size === 0) {
      this.teardown();
    }
  }

  teardown() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.globalHandlersAttached = false;
    this.joinedRooms.clear();
    this.notifyConnection("disconnected");
  }
}

export const deliveryTrackingSocket = new DeliveryTrackingSocketManager();
