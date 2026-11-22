import { access, copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, '_site');
const publicFiles = [
  'index.html',
  'app.js',
  'state.js',
  'lessons.js',
  'styles.css',
  'assets/favicon.svg',
  'assets/island-map.svg',
];

// Check inputs before replacing the previous build, and publish only this list.
await Promise.all(publicFiles.map(file => access(path.join(root, file))));
await rm(output, { recursive: true, force: true });

for (const file of publicFiles) {
  const destination = path.join(output, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(root, file), destination);
}

await writeFile(path.join(output, '.nojekyll'), '');
console.log(`Built ${publicFiles.length} public files in _site/.`);
