import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const inventoryBackendPort = process.env.INVENTORY_BACKEND_PORT ?? '4001';
const inventoryFrontendPort = process.env.INVENTORY_FRONTEND_PORT ?? '5176';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const services = [
  {
    name: 'inventory/backend',
    cwd: path.join(rootDir, 'inventory-erp', 'backend'),
    command: npmCommand,
    args: ['run', 'start:dev'],
    env: { ...process.env, PORT: inventoryBackendPort },
  },
  {
    name: 'inventory/frontend',
    cwd: path.join(rootDir, 'inventory-erp', 'frontend'),
    command: npmCommand,
    args: ['run', 'dev', '--', '--host', '0.0.0.0', '--port', inventoryFrontendPort],
    env: process.env,
  },
];

const children = [];
let shuttingDown = false;

function quoteWindowsArg(value) {
  if (/[\s"]/u.test(value)) return `"${value.replace(/"/g, '\\"')}"`;
  return value;
}

function getSpawnConfig(service) {
  if (process.platform !== 'win32') {
    return {
      command: service.command,
      args: service.args,
      options: { cwd: service.cwd, env: service.env, stdio: ['inherit', 'pipe', 'pipe'] },
    };
  }
  const comSpec = process.env.ComSpec ?? 'cmd.exe';
  const commandLine = [service.command, ...service.args].map(quoteWindowsArg).join(' ');
  return {
    command: comSpec,
    args: ['/d', '/s', '/c', commandLine],
    options: { cwd: service.cwd, env: service.env, stdio: ['inherit', 'pipe', 'pipe'], windowsVerbatimArguments: false },
  };
}

function prefixStream(stream, label, writer) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) writer(`[${label}] ${line}\n`);
  });
  stream.on('end', () => {
    if (buffer.length > 0) { writer(`[${label}] ${buffer}\n`); buffer = ''; }
  });
}

function killChild(child) {
  if (!child || child.killed) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).on('error', () => {});
    return;
  }
  child.kill('SIGTERM');
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) killChild(child);
  setTimeout(() => process.exit(exitCode), 300);
}

for (const service of services) {
  const spawnConfig = getSpawnConfig(service);
  const child = spawn(spawnConfig.command, spawnConfig.args, spawnConfig.options);
  children.push(child);
  prefixStream(child.stdout, service.name, process.stdout.write.bind(process.stdout));
  prefixStream(child.stderr, service.name, process.stderr.write.bind(process.stderr));
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    process.stderr.write(`[${service.name}] exited with ${signal ? `signal ${signal}` : `code ${code ?? 0}`}\n`);
    shutdown(code ?? 1);
  });
  child.on('error', (error) => {
    if (shuttingDown) return;
    process.stderr.write(`[${service.name}] failed to start: ${error.message}\n`);
    shutdown(1);
  });
}

process.stdout.write(
  [
    'Starting Inventory Management ERP...',
    `- backend: http://localhost:${inventoryBackendPort}`,
    `- frontend: http://localhost:${inventoryFrontendPort}`,
    `- Swagger docs: http://localhost:${inventoryBackendPort}/api/docs`,
    'Press Ctrl+C to stop.',
    '',
  ].join('\n'),
);

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
