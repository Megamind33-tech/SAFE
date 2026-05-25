/**
 * Installs trimmed SAFE payment icons from safe_payment_assets pack.
 * Delegates to trim-payment-assets.mjs (*_icon_288px.png only).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packDir = process.argv[2] || path.join(__dirname, '../src/assets/payment-pack-png');

const child = spawn(process.execPath, [path.join(__dirname, 'trim-payment-assets.mjs'), packDir], {
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 1));
