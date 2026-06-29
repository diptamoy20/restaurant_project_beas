import { io } from "socket.io-client";
import { loadPersistedAuth } from "../utils/auth";

let socket = null;

/**
 * Connect to the /delivery-tracking namespace.
 *
 * onOrderUpdated(orderId, payload) — called when the backend emits
 * `order:updated` for a specific order room the client has joined.
 *
 * The old `orders:refresh` global broadcast has been removed from the
 * backend. All updates are now targeted per-order via `order:updated`,
 * and the admin order list is refreshed by RTK Query tag invalidation
 * on mutation responses — not by socket broadcasts.
 *
 * VITE_SOCKET_URL must be the bare server origin, e.g. http://localhost:4000
 */
export function connectOrderSocket(onOrderUpdated) {
  const socketOrigin = import.meta.env.VITE_SOCKET_URL;

  if (!socketOrigin || socketOrigin === "undefined") {
    console.error(
      "[orderSocket] VITE_SOCKET_URL is not defined. " +
        "Add VITE_SOCKET_URL=http://localhost:4000 to your .env and restart Vite.",
    );
    return null;
  }

  // Reuse an existing live connection — never open a second socket.
  if (socket?.connected) {
    console.debug("[orderSocket] Reusing existing connection", socket.id);
    return socket;
  }

  const auth = loadPersistedAuth();
  const token = auth?.token ?? auth?.accessToken ?? null;

  if (!token) {
    console.warn(
      "[orderSocket] No auth token found. Backend will reject this connection.",
    );
  }

  const url = `${socketOrigin.replace(/\/$/, "")}/delivery-tracking`;
  console.debug("[orderSocket] Connecting to", url);

  socket = io(url, {
    transports: ["websocket"],
    auth: { token },
    // Prevent socket.io from reconnecting indefinitely on auth failure.
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  socket.on("connect", () => {
    console.info("[orderSocket] Connected — id:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("[orderSocket] Connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.info("[orderSocket] Disconnected — reason:", reason);
  });

  socket.on("tracking:error", (payload) => {
    console.warn("[orderSocket] Server auth/tracking error:", payload?.message);
  });

  // ── Order events ───────────────────────────────────────────────────────────

  // `order:updated` is a room-scoped event emitted by the backend only to
  // clients that have joined a specific order room via `track:join`.
  // The admin panel does not join order rooms, so this handler will only
  // fire if a future feature explicitly calls socket.emit('track:join', ...).
  // It is wired here for completeness and forward compatibility.
  socket.on("order:updated", (payload) => {
    console.debug("[orderSocket] order:updated received", payload?.type, payload?.status);
    onOrderUpdated?.(payload?.order?.id, payload);
  });

  // NOTE: `orders:refresh` has been removed from the backend.
  // The admin order list now refreshes exclusively via RTK Query cache
  // invalidation on mutation responses (acceptOrder, updateOrderStatus,
  // assignDeliveryAgent). This eliminates the broadcast → refetch → rerender
  // → socket reconnect loop that caused excessive /track requests.

  return socket;
}

export function disconnectOrderSocket() {
  if (socket) {
    console.debug("[orderSocket] Disconnecting");
    socket.disconnect();
    socket = null;
  }
}
