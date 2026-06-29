import { io } from "socket.io-client";
import { loadPersistedAuth } from "../utils/auth";

let socket;

export function connectOrderSocket(onRefresh) {
  const socketOrigin = import.meta.env.VITE_SOCKET_URL;

  if (!socketOrigin || socketOrigin === "undefined") {
    console.error("[orderSocket] Missing VITE_SOCKET_URL");
    return null;
  }

  const auth = loadPersistedAuth();
  const token = auth?.token ?? auth?.accessToken;

  if (!socket) {
    const url = `${socketOrigin.replace(/\/$/, "")}/delivery-tracking`;

    socket = io(url, {
      transports: ["websocket"],
      auth: { token },
    });

    socket.on("connect", () => {
      console.log("Socket connected", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected", reason);
    });

    socket.on("connect_error", (err) => {
      console.log("Socket error", err.message);
    });
  }

  // IMPORTANT
  socket.off("orders:refresh");

  socket.on("orders:refresh", () => {
    console.count("orders:refresh");
    onRefresh?.();
  });

  return socket;
}

export function disconnectOrderSocket() {
  if (!socket) return;

  socket.off("orders:refresh");

  socket.disconnect();

  socket = null;
}