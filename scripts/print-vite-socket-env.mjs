import { resolveWebAppSocketEnv } from "./resolve-socket-origin.mjs";

const env = resolveWebAppSocketEnv({
  apiBaseUrl: process.env.PUBLIC_API_BASE_URL ?? process.env.VITE_API_BASE_URL,
  socketUrl: process.env.PUBLIC_SOCKET_URL ?? process.env.VITE_SOCKET_URL,
  trackingSocketUrl: process.env.VITE_TRACKING_SOCKET_URL,
  publicApiUrl: process.env.PUBLIC_API_URL,
  backendPort: process.env.PORT ?? process.env.BACKEND_PORT,
});

for (const [key, value] of Object.entries(env)) {
  if (value) {
    process.stdout.write(`${key}=${value}\n`);
  }
}
