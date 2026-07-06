import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { resolveTrackingSocketUrl } from "./resolve-socket-origin.mjs";

const distDir = path.join(process.cwd(), "web-app", "dist", "assets");
const expectedUrl = resolveTrackingSocketUrl({
  apiBaseUrl: process.env.VITE_API_BASE_URL ?? process.env.PUBLIC_API_BASE_URL,
  socketUrl: process.env.VITE_SOCKET_URL ?? process.env.PUBLIC_SOCKET_URL,
  trackingSocketUrl: process.env.VITE_TRACKING_SOCKET_URL,
  publicApiUrl: process.env.PUBLIC_API_URL,
  backendPort: process.env.PORT ?? process.env.BACKEND_PORT,
});

if (!expectedUrl) {
  console.error("Could not resolve expected tracking socket URL from env");
  process.exit(1);
}

const expectedOrigin = new URL(expectedUrl).origin;
const assetFiles = fs
  .readdirSync(distDir)
  .filter((name) => name.endsWith(".js"))
  .map((name) => path.join(distDir, name));

let foundExpected = false;

for (const filePath of assetFiles) {
  const content = fs.readFileSync(filePath, "utf8");

  if (content.includes(expectedOrigin) && content.includes("delivery-tracking")) {
    foundExpected = true;
    break;
  }
}

if (!foundExpected) {
  console.error(`Build verification failed: expected socket origin ${expectedOrigin} not found in dist assets`);
  console.error(`Expected tracking URL: ${expectedUrl}`);
  process.exit(1);
}

console.log(`Verified web-app build includes tracking socket origin ${expectedOrigin}`);
