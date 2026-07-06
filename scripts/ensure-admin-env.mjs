import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, "admin-panel", ".env");

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

function isSet(value) {
  const normalized = String(value ?? "").trim();
  return Boolean(normalized && normalized !== "undefined");
}

if (!fs.existsSync(envPath)) {
  console.error(`Missing ${envPath}`);
  process.exit(1);
}

const env = parseEnvFile(envPath);
const linesToAppend = [];

if (!isSet(env.VITE_API_BASE_URL)) {
  console.error("admin-panel/.env is missing VITE_API_BASE_URL");
  process.exit(1);
}

if (!isSet(env.VITE_SOCKET_URL) && isSet(env.VITE_API_BASE_URL)) {
  const apiBase = env.VITE_API_BASE_URL.trim().replace(/\/$/, "");
  const origin = apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase;
  linesToAppend.push(`VITE_SOCKET_URL="${origin}"`);
}

if (linesToAppend.length === 0) {
  process.stdout.write("admin-panel/.env already includes API and socket configuration\n");
  process.exit(0);
}

const suffix = linesToAppend.join("\n");
fs.appendFileSync(envPath, `\n# Added automatically on deploy\n${suffix}\n`);
process.stdout.write(`Appended missing socket vars to admin-panel/.env:\n${suffix}\n`);
