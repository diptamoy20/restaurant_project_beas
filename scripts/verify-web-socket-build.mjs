import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webAppEnvPath = path.join(repoRoot, "web-app", ".env");

function parseEnvFile(filePath) {
  const env = {};

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

if (!fs.existsSync(webAppEnvPath)) {
  console.error(`Build verification failed: missing ${webAppEnvPath}`);
  process.exit(1);
}

const env = parseEnvFile(webAppEnvPath);
const expectedUrl =
  env.VITE_TRACKING_SOCKET_URL?.trim() ||
  (env.VITE_SOCKET_URL
    ? `${env.VITE_SOCKET_URL.replace(/\/$/, "")}/delivery-tracking`
    : "");

if (!expectedUrl) {
  console.error(
    "Build verification failed: set VITE_TRACKING_SOCKET_URL or VITE_SOCKET_URL in web-app/.env",
  );
  process.exit(1);
}

function resolveDistAssetsDir() {
  const candidates = [
    path.join(repoRoot, "web-app", "dist", "assets"),
    path.join(process.cwd(), "dist", "assets"),
    path.join(process.cwd(), "web-app", "dist", "assets"),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  return candidates[0];
}

const distDir = resolveDistAssetsDir();

if (!fs.existsSync(distDir)) {
  console.error(`Build verification failed: dist assets directory not found at ${distDir}`);
  process.exit(1);
}

const expectedOrigin = new URL(expectedUrl).origin;
const assetFiles = fs
  .readdirSync(distDir)
  .filter((name) => name.endsWith(".js"))
  .map((name) => path.join(distDir, name));

const foundExpected = assetFiles.some((filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  return content.includes(expectedOrigin) && content.includes("delivery-tracking");
});

if (!foundExpected) {
  console.error(`Build verification failed: expected socket origin ${expectedOrigin} not found in dist assets`);
  console.error(`Expected tracking URL from web-app/.env: ${expectedUrl}`);
  process.exit(1);
}

console.log(`Verified web-app build includes tracking socket origin ${expectedOrigin}`);
