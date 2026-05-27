/**
 * Copy .env.staging.example → .env when .env is missing (local prep only).
 */
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const pairs = [
  ['apps/backend/.env.staging.example', 'apps/backend/.env'],
  ['apps/mobile/.env.staging.example', 'apps/mobile/.env'],
  ['apps/dashboard/.env.staging.example', 'apps/dashboard/.env'],
];

for (const [src, dest] of pairs) {
  const from = path.join(root, src);
  const to = path.join(root, dest);
  if (existsSync(to)) {
    console.log('skip (exists)', dest);
    continue;
  }
  copyFileSync(from, to);
  console.log('created', dest, 'from', src);
}

console.log('\nEdit .env files with real staging URLs and secrets, then: npm run staging:validate');
