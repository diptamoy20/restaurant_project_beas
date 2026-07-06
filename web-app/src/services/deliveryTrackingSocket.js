import { io } from "socket.io-client";

import {
  isTrackingSocketDebugEnabled,
  resolveTrackingSocketUrl,
} from "../config/trackingSocket";
import {
  getValidAccessToken,
  isAuthTokenError,
} from "./authToken";

class DeliveryTrackingSocketManager {
  constructor() {
    this.socket = null;
    this.lastSocketUrl = null;
    this.subscriptions = new Map();
    this.joinedRooms = new Set();
    this.globalHandlersAttached = false;
    this.connectionListeners = new Set();
    this.connectPromise = null;
    this.authRetryUsed = false;
    this.onReconnectAttempt = async () => {
      const token = await getValidAccessToken({ forceRefresh: true });

      if (token && this.socket) {
        this.socket.auth = { token };
      }
    };
  }

  async ensureConnected() {
    const token = await getValidAccessToken();

    if (!token) {
      throw new Error("Sign in again to track your delivery.");
    }

    if (this.socket?.connected) {
      this.socket.auth = { token };
      return this.socket;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.openSocket(token).finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  async openSocket(token) {
    if (!this.socket) {
      const socketUrl = resolveTrackingSocketUrl();

      if (isTrackingSocketDebugEnabled()) {
        console.info("[tracking] connecting to", socketUrl, {
          dev: import.meta.env.DEV,
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
      await new Promise((resolve, reject) => {
        const socket = this.socket;
        let settled = false;

        const cleanup = () => {
          socket.off("connect", onConnect);
          socket.off("connect_error", onConnectError);
          socket.off("tracking:error", onTrackingError);
        };

        const finish = (callback) => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();
          callback();
        };

        const onConnect = () => {
          finish(resolve);
        };

        const onConnectError = (error) => {
          finish(() => {
            reject(error);
          });
        };

        const onTrackingError = (payload) => {
          if (isAuthTokenError(payload?.message)) {
            finish(() => {
              reject(new Error(payload.message ?? "Tracking authentication failed"));
            });
          }
        };

        socket.once("connect", onConnect);
        socket.once("connect_error", onConnectError);
        socket.once("tracking:error", onTrackingError);
        socket.connect();
      });
    }

    return this.socket;
  }

  attachGlobalHandlers() {
    if (!this.socket || this.globalHandlersAttached) {
      return;
    }

    this.globalHandlersAttached = true;

    this.socket.io.on("reconnect_attempt", this.onReconnectAttempt);

    this.socket.on("connect", () => {
      this.authRetryUsed = false;
      this.notifyConnection("connected");
      this.rejoinActiveRooms();
    });

    this.socket.on("disconnect", (reason) => {
      this.notifyConnection("disconnected", reason);
    });

    this.socket.on("connect_error", async (error) => {
      const message = error?.message ?? "Connection failed";

      if (isTrackingSocketDebugEnabled()) {
        console.error("[tracking] connection failed", {
          url: this.lastSocketUrl ?? resolveTrackingSocketUrl(),
          message,
        });
      }

      if (!this.authRetryUsed && isAuthTokenError(message)) {
        this.authRetryUsed = true;
        const refreshed = await getValidAccessToken({ forceRefresh: true });

        if (refreshed && this.socket) {
          this.socket.auth = { token: refreshed };
          this.socket.connect();
          return;
        }
      }

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

    this.socket.on("tracking:error", async (payload) => {
      const message = payload?.message ?? "Tracking error";

      if (!this.authRetryUsed && isAuthTokenError(message)) {
        this.authRetryUsed = true;
        const refreshed = await getValidAccessToken({ forceRefresh: true });

        if (refreshed && this.socket) {
          this.teardownSocketOnly();
          try {
            await this.ensureConnected();
            this.rejoinActiveRooms();
            return;
          } catch {
            // fall through to error reporting
          }
        }
      }

      this.notifyConnection("error", message);
      this.subscriptions.forEach((listeners) => {
        listeners.forEach((listener) => {
          listener.onError?.(message);
        });
      });
    });
  }

  teardownSocketOnly() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.io.off("reconnect_attempt", this.onReconnectAttempt);
      this.socket.disconnect();
      this.socket = null;
    }

    this.globalHandlersAttached = false;
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

    if (!this.joinedRooms.has(roomKey)) {
      this.joinedRooms.add(roomKey);
    }

    void this.ensureConnected()
      .then((socket) => {
        if (socket.connected) {
          this.emitTrackJoin(orderId);
        }
      })
      .catch((error) => {
        listener.onError?.(error?.message ?? "Unable to connect to live tracking.");
        listener.onConnectionChange?.("error", error?.message);
      });

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
    this.teardownSocketOnly();
    this.joinedRooms.clear();
    this.authRetryUsed = false;
    this.notifyConnection("disconnected");
  }
}

export const deliveryTrackingSocket = new DeliveryTrackingSocketManager();
