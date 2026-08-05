const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const instances = process.env.PM2_INSTANCES ?? '1';
const execMode = instances === '1' ? 'fork' : 'cluster';
const envFile =
  process.env.PM2_ENV_FILE ?? path.join(__dirname, '..', '..', 'shared', 'inventory-backend.env');
const script = path.join(__dirname, 'dist', 'main.js');
const fileEnv = fs.existsSync(envFile) ? dotenv.parse(fs.readFileSync(envFile)) : {};

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME ?? 'inventory-backend',
      cwd: __dirname,
      script,
      instances,
      exec_mode: execMode,
      env: {
        ...fileEnv,
        ...process.env,
        NODE_ENV: process.env.NODE_ENV ?? 'production',
      },
      autorestart: true,
      max_memory_restart: process.env.PM2_MAX_MEMORY_RESTART ?? '512M',
      kill_timeout: Number(process.env.PM2_KILL_TIMEOUT ?? 15000),
      listen_timeout: Number(process.env.PM2_LISTEN_TIMEOUT ?? 15000),
      exp_backoff_restart_delay: Number(process.env.PM2_BACKOFF_MS ?? 200),
      min_uptime: process.env.PM2_MIN_UPTIME ?? '10s',
      time: true,
    },
  ],
};
