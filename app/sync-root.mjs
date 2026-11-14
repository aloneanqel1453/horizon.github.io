import { cpSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(appDir, '..');
const distDir = resolve(appDir, 'dist');

for (const sub of ['assets', 'brand', 'fonts']) {
  const target = resolve(rootDir, sub);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}

cpSync(distDir, rootDir, { recursive: true, force: true });
writeFileSync(resolve(rootDir, '.nojekyll'), '');
console.log('Synced production bundle to repository root.');

