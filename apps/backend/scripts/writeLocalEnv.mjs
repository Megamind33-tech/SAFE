import fs from 'node:fs';
import path from 'node:path';

const envExamplePath = path.resolve(process.cwd(), '.env.example');
const envPath = path.resolve(process.cwd(), '.env');

const base = fs.readFileSync(envExamplePath, 'utf8');
const dbAbs = path.resolve(process.cwd(), 'dev.db').replace(/\\/g, '/');
const dbUrl = `DATABASE_URL="file:${dbAbs}"`;

const next = base
  .split(/\r?\n/)
  .map((line) => (line.startsWith('DATABASE_URL=') ? dbUrl : line))
  .join('\n');

fs.writeFileSync(envPath, next, 'utf8');
console.log('[safe-backend] wrote .env with absolute DATABASE_URL');

