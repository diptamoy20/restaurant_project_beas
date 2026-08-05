import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const projects = [
  { name: 'inventory-erp/backend', cwd: path.join(rootDir, 'inventory-erp', 'backend') },
  { name: 'inventory-erp/frontend', cwd: path.join(rootDir, 'inventory-erp', 'frontend') },
];

function quoteWindowsArg(value) {
  if (/[\s"]/u.test(value)) return `"${value.replace(/"/g, '\\"')}"`;
  return value;
}

function runNpmCmd(project, cmd) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : npmCommand;
    const args = process.platform === 'win32'
      ? ['/d', '/s', '/c', [npmCommand, 'run', cmd].map(quoteWindowsArg).join(' ')]
      : ['run', cmd];
    const child = spawn(command, args, { cwd: project.cwd, env: process.env, stdio: 'inherit' });
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${project.name} ${cmd} failed with code ${code ?? 1}`)));
    child.on('error', reject);
  });
}

for (const project of projects) {
  process.stdout.write(`Building ${project.name}...\n`);
  try { await runNpmCmd(project, 'build'); } catch (error) { process.stderr.write(`${error.message}\n`); process.exit(1); }
}

process.stdout.write('Inventory ERP builds completed.\n');
