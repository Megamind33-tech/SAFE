/**
 * Build backend, mobile, and dashboard for staging after env validation.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function run(cmd, cwd = root) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

run('node scripts/staging/validate-env.mjs', root);
run('npm install', root);
run('npx prisma migrate deploy', path.join(root, 'apps/backend'));
run('npx prisma generate', path.join(root, 'apps/backend'));
run('npm run build', path.join(root, 'apps/backend'));
run('npm run build', path.join(root, 'apps/mobile'));
run('npm run build', path.join(root, 'apps/dashboard'));
console.log('\nStaging builds complete.');
console.log('  Backend: apps/backend/dist/');
console.log('  Mobile:  apps/mobile/dist/');
console.log('  Dashboard: apps/dashboard/dist/');
