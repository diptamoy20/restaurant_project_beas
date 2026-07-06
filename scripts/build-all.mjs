import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const backendPort = process.env.PORT ?? '4000';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const projects = [
  {
    name: 'backend',
    cwd: path.join(rootDir, 'backend'),
    env: {
      ...process.env,
      PORT: backendPort,
    },
  },
  {
    name: 'web-app',
    cwd: path.join(rootDir, 'web-app'),
    env: process.env,
  },
  {
    name: 'admin-panel',
    cwd: path.join(rootDir, 'admin-panel'),
    env: process.env,
  },
  {
    name: 'qr-ordering-frontend',
    cwd: path.join(rootDir, 'qr-ordering-frontend'),
    env: process.env,
  },
];

function quoteWindowsArg(value) {
  if (/[\s"]/u.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return value;
}

function runNpmBuild(project) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : npmCommand;
    const args =
      process.platform === 'win32'
        ? ['/d', '/s', '/c', [npmCommand, 'run', 'build'].map(quoteWindowsArg).join(' ')]
        : ['run', 'build'];

    const child = spawn(command, args, {
      cwd: project.cwd,
      env: project.env,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${project.name} build failed with code ${code ?? 1}`));
    });

    child.on('error', reject);
  });
}

for (const project of projects) {
  process.stdout.write(`Building ${project.name}...\n`);
  try {
    // eslint-disable-next-line no-await-in-loop
    await runNpmBuild(project);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

process.stdout.write('All project builds completed.\n');
