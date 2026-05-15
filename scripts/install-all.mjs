import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const projects = [
  { name: 'backend', cwd: path.join(rootDir, 'backend') },
  { name: 'web-app', cwd: path.join(rootDir, 'web-app') },
  { name: 'admin-panel', cwd: path.join(rootDir, 'admin-panel') },
  { name: 'qr-ordering-frontend', cwd: path.join(rootDir, 'qr-ordering-frontend') },
];

function quoteWindowsArg(value) {
  if (/[\s"]/u.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return value;
}

function runNpmInstall(project) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : npmCommand;
    const args =
      process.platform === 'win32'
        ? ['/d', '/s', '/c', [npmCommand, 'install'].map(quoteWindowsArg).join(' ')]
        : ['install'];

    const child = spawn(command, args, {
      cwd: project.cwd,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${project.name} install failed with code ${code ?? 1}`));
    });

    child.on('error', reject);
  });
}

for (const project of projects) {
  process.stdout.write(`Installing ${project.name} dependencies...\n`);
  try {
    // eslint-disable-next-line no-await-in-loop
    await runNpmInstall(project);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

process.stdout.write('All project dependencies installed.\n');
