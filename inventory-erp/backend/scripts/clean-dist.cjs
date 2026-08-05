const fs = require('node:fs');
const path = require('node:path');

const backendRoot = path.resolve(__dirname, '..');
const pathsToRemove = [
  path.join(backendRoot, 'dist'),
  path.join(backendRoot, 'tsconfig.build.tsbuildinfo'),
  path.join(backendRoot, 'tsconfig.tsbuildinfo'),
];

for (const targetPath of pathsToRemove) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}
