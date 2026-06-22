/**
 * React Native delivery tracking socket service (reference implementation).
 *
 * Copy into your app and wire GlobalApi / GlobalLoginAuth to your project.
 *
 * Critical rules:
 * 1. socket URL = DELIVERY_TRACKING_SOCKET_URL from backend dashboard
 * 2. Use transports: ['polling', 'websocket'] — websocket-only fails on many RN devices
 * 3. Do not connect at module load — refresh auth token in connectSocket()
 * 4. Prefer trackingSocketUrl from GET /api/deliveries/me/dashboard when available
 */
import { io, Socket } from 'socket.io-client';

import GlobalApi from '../GlobalContainer/GlobalApi';
import GlobalLoginAuth from '../GlobalContainer/GlobalLoginAuth';

let socket: Socket | null = null;

function resolveAccessToken(): string | null {
  const token = GlobalLoginAuth.accessToken ?? GlobalLoginAuth.token ?? null;

  if (!token || token === 'undefined' || token === 'null') {
    return null;
  }

  return token.trim();
}

function resolveSocketUrl(overrideUrl?: string | null): string {
  if (overrideUrl) {
    return overrideUrl.replace(/\/$/, '');
  }

  const socketUrl = String(
    GlobalApi.delivery_tracking_socket_url ??
      GlobalApi.trackingSocketUrl ??
      GlobalApi.socket_url ??
      '',
  ).replace(/\/$/, '');

  if (!socketUrl) {
    throw new Error('[tracking] Missing delivery tracking socket URL');
  }

  return socketUrl;
}

export function connectSocket(options?: { socketUrl?: string }): Socket {
  const accessToken = resolveAccessToken();

  if (!accessToken) {
    throw new Error('[tracking] Missing access token before socket connect');
  }

  const socketUrl = resolveSocketUrl(options?.socketUrl);

  console.log('[tracking] connecting', {
    socketUrl,
    tokenPreview: `${accessToken.slice(0, 12)}...`,
  });

  if (socket) {
    socket.auth = { token: accessToken };
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socket = io(socketUrl, {
    autoConnect: false,
    transports: ['polling', 'websocket'],
    path: '/socket.io',
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
    timeout: 45_000,
    auth: { token: accessToken },
  });

  socket.on('tracking:connected', () => console.log('[tracking] tracking:connected'));
  socket.on('tracking:error', (err) => console.error('[tracking:error]', err));

  socket.on('connect', () => {
    console.log('[tracking] socket connected id=', socket?.id);
  });

  socket.on('connect_error', (err: Error) => {
    console.error('[tracking] connect_error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[tracking] disconnected:', reason);
  });

  socket.connect();
  return socket;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
};
