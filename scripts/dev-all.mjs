import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const backendPort = process.env.PORT ?? '4000';
const frontendPort = process.env.FRONTEND_PORT ?? '5173';
const adminPanelPort = process.env.ADMIN_PANEL_PORT ?? '5174';
const qrOrderingPort = process.env.QR_ORDERING_PORT ?? '5175';
const inventoryBackendPort = process.env.INVENTORY_BACKEND_PORT ?? '4001';
const inventoryFrontendPort = process.env.INVENTORY_FRONTEND_PORT ?? '5176';
const apiBaseUrl = process.env.VITE_API_BASE_URL ?? `http://localhost:${backendPort}/api`;
const corsOrigins =
  process.env.CORS_ORIGINS ??
  [
    `http://localhost:${backendPort}`,
    `http://localhost:${frontendPort}`,
    `http://localhost:${adminPanelPort}`,
    `http://localhost:${qrOrderingPort}`,
    `http://localhost:${inventoryFrontendPort}`,
  ].join(',');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const services = [
  {
    name: 'backend',
    cwd: path.join(rootDir, 'backend'),
    command: npmCommand,
    args: ['run', 'start:dev'],
    env: {
      ...process.env,
      PORT: backendPort,
      CORS_ORIGINS: corsOrigins,
    },
  },
  {
    name: 'web-app',
    cwd: path.join(rootDir, 'web-app'),
    command: npmCommand,
    args: ['run', 'dev', '--', '--host', '0.0.0.0', '--port', frontendPort],
    env: process.env,
  },
  {
    name: 'admin-panel',
    cwd: path.join(rootDir, 'admin-panel'),
    command: npmCommand,
    args: ['run', 'dev', '--', '--host', '0.0.0.0', '--port', adminPanelPort],
    env: process.env,
  },
  {
    name: 'qr-ordering-frontend',
    cwd: path.join(rootDir, 'qr-ordering-frontend'),
    command: npmCommand,
    args: ['run', 'dev', '--', '--host', '0.0.0.0', '--port', qrOrderingPort],
    env: process.env,
  },
  {
    name: 'inventory-erp/backend',
    cwd: path.join(rootDir, 'inventory-erp', 'backend'),
    command: npmCommand,
    args: ['run', 'start:dev'],
    env: {
      ...process.env,
      PORT: inventoryBackendPort,
    },
  },
  {
    name: 'inventory-erp/frontend',
    cwd: path.join(rootDir, 'inventory-erp', 'frontend'),
    command: npmCommand,
    args: ['run', 'dev', '--', '--host', '0.0.0.0', '--port', inventoryFrontendPort],
    env: process.env,
  },
];

const children = [];
let shuttingDown = false;

const requiredFiles = [
  {
    label: 'backend dependencies',
    path: path.join(rootDir, 'backend', 'node_modules', '.bin', process.platform === 'win32' ? 'nest.cmd' : 'nest'),
  },
  {
    label: 'web-app dependencies',
    path: path.join(rootDir, 'web-app', 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite'),
  },
  {
    label: 'admin-panel dependencies',
    path: path.join(rootDir, 'admin-panel', 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite'),
  },
  {
    label: 'qr-ordering-frontend dependencies',
    path: path.join(rootDir, 'qr-ordering-frontend', 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite'),
  },
  {
    label: 'inventory-erp/backend dependencies',
    path: path.join(rootDir, 'inventory-erp', 'backend', 'node_modules', '.bin', process.platform === 'win32' ? 'nest.cmd' : 'nest'),
  },
  {
    label: 'inventory-erp/frontend dependencies',
    path: path.join(rootDir, 'inventory-erp', 'frontend', 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite'),
  },
];

const missingFiles = requiredFiles.filter((entry) => !fs.existsSync(entry.path));

if (missingFiles.length > 0) {
  process.stderr.write('Missing local dependencies:\n');

  for (const entry of missingFiles) {
    process.stderr.write(`- ${entry.label}\n`);
  }

  process.stderr.write('\nRun `npm run install:all` from the repo root, then retry `npm run dev`.\n');
  process.exit(1);
}

function quoteWindowsArg(value) {
  if (/[\s"]/u.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return value;
}

function getSpawnConfig(service) {
  if (process.platform !== 'win32') {
    return {
      command: service.command,
      args: service.args,
      options: {
        cwd: service.cwd,
        env: service.env,
        stdio: ['inherit', 'pipe', 'pipe'],
      },
    };
  }

  const comSpec = process.env.ComSpec ?? 'cmd.exe';
  const commandLine = [service.command, ...service.args].map(quoteWindowsArg).join(' ');

  return {
    command: comSpec,
    args: ['/d', '/s', '/c', commandLine],
    options: {
      cwd: service.cwd,
      env: service.env,
      stdio: ['inherit', 'pipe', 'pipe'],
      windowsVerbatimArguments: false,
    },
  };
}

function prefixStream(stream, label, writer) {
  let buffer = '';

  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      writer(`[${label}] ${line}\n`);
    }
  });

  stream.on('end', () => {
    if (buffer.length > 0) {
      writer(`[${label}] ${buffer}\n`);
      buffer = '';
    }
  });
}

function killChild(child) {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
    killer.on('error', () => { });
    return;
  }

  child.kill('SIGTERM');
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    killChild(child);
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 300);
}

for (const service of services) {
  const spawnConfig = getSpawnConfig(service);
  const child = spawn(spawnConfig.command, spawnConfig.args, spawnConfig.options);

  children.push(child);
  prefixStream(child.stdout, service.name, process.stdout.write.bind(process.stdout));
  prefixStream(child.stderr, service.name, process.stderr.write.bind(process.stderr));

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    process.stderr.write(`[${service.name}] exited with ${reason}\n`);
    shutdown(code ?? 1);
  });

  child.on('error', (error) => {
    if (shuttingDown) {
      return;
    }

    process.stderr.write(`[${service.name}] failed to start: ${error.message}\n`);
    shutdown(1);
  });
}

process.stdout.write(
  [
    'Starting local stack...',
    `- backend (restaurant): http://localhost:${backendPort}`,
    `- web-app: http://localhost:${frontendPort}`,
    `- admin-panel: http://localhost:${adminPanelPort}`,
    `- qr-ordering-frontend: http://localhost:${qrOrderingPort}`,
    `- inventory-erp/backend: http://localhost:${inventoryBackendPort}`,
    `- inventory-erp/frontend: http://localhost:${inventoryFrontendPort}`,
    `- API base URL: ${apiBaseUrl}`,
    'Press Ctrl+C to stop all services.',
    '',
  ].join('\n'),
);

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
