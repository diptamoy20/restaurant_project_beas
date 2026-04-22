import { io } from 'socket.io-client';

function resolveSocketUrl() {
  const explicitUrl = import.meta.env.VITE_API_URL;
  const baseApiUrl = import.meta.env.VITE_API_BASE_URL;

  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, '');
  }

  if (baseApiUrl) {
    return baseApiUrl.replace(/\/api\/?$/, '');
  }

  return 'http://localhost:4000';
}

export const socket = io(resolveSocketUrl(), {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  transports: ['websocket', 'polling'],
});
