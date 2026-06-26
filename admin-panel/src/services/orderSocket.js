import { io } from "socket.io-client";
import { loadPersistedAuth } from "../utils/auth";

let socket;

/**
 * Connect to the /delivery-tracking namespace and call onRefresh whenever
 * the backend broadcasts an "orders:refresh" event.
 *
 * VITE_SOCKET_URL must be set to the bare server origin, e.g.
 *   VITE_SOCKET_URL=http://localhost:4000
 * Do NOT include /api or a trailing slash.
 */
export function connectOrderSocket(onRefresh) {
  // Guard: catch the undefined URL early with a clear error instead of a
  // cryptic "ws://undefined" failure in the network tab.
  const socketOrigin = import.meta.env.VITE_SOCKET_URL;
  if (!socketOrigin || socketOrigin === "undefined") {
    console.error(
      "[orderSocket] VITE_SOCKET_URL is not defined. " +
        "Add VITE_SOCKET_URL=http://localhost:4000 to your .env file and restart Vite.",
    );
    return null;
  }

  // Avoid duplicate connections if the component remounts.
  if (socket?.connected) {
    console.debug("[orderSocket] Reusing existing connection", socket.id);
    return socket;
  }

  const auth = loadPersistedAuth();
  const token = auth?.token ?? auth?.accessToken ?? null;

  if (!token) {
    console.warn(
      "[orderSocket] No auth token found. The backend will reject this connection.",
    );
  }

  const url = `${socketOrigin.replace(/\/$/, "")}/delivery-tracking`;
  console.debug("[orderSocket] Connecting to", url);

  socket = io(url, {
    transports: ["websocket"],
    auth: { token },
  });

  socket.on("connect", () => {
    console.info("[orderSocket] Connected — id:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("[orderSocket] Connection error:", err.message, err);
  });

  socket.on("disconnect", (reason) => {
    console.info("[orderSocket] Disconnected — reason:", reason);
  });

  socket.on("tracking:error", (payload) => {
    console.warn("[orderSocket] Server auth error:", payload?.message);
  });

  // The backend calls server.emit('orders:refresh') to broadcast to all
  // authenticated clients on the /delivery-tracking namespace.
  socket.on("orders:refresh", () => {
    console.debug("[orderSocket] orders:refresh received → refetching");
    onRefresh?.();
  });

  return socket;
}

export function disconnectOrderSocket() {
  if (socket) {
    console.debug("[orderSocket] Disconnecting");
    socket.disconnect();
    socket = null;
  }
}
