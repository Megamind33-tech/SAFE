/**
 * Validate staging env files before build/deploy.
 * Usage: node scripts/staging/validate-env.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadEnvFile(relPath) {
  const file = path.join(root, relPath);
  if (!existsSync(file)) return { file, vars: null, missing: true };
  const text = readFileSync(file, 'utf8');
  const vars = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return { file, vars, missing: false };
}

function fail(msg) {
  console.error('FAIL', msg);
  process.exitCode = 1;
}

function ok(msg) {
  console.log('OK', msg);
}

const errors = [];

const backend = loadEnvFile('apps/backend/.env');
const mobile = loadEnvFile('apps/mobile/.env');
const dashboard = loadEnvFile('apps/dashboard/.env');

if (backend.missing) {
  errors.push('Missing apps/backend/.env — copy from apps/backend/.env.staging.example');
} else {
  const b = backend.vars;
  if (b.JWT_SECRET?.includes('dev-secret') || b.JWT_SECRET?.includes('REPLACE')) {
    errors.push('backend JWT_SECRET must be a real staging secret (not dev/REPLACE)');
  }
  if (!b.CORS_ORIGINS?.startsWith('https://')) {
    errors.push('backend CORS_ORIGINS must use HTTPS staging origins');
  }
  if (!b.SAFE_QR_PUBLIC_BASE_URL?.startsWith('https://')) {
    errors.push('backend SAFE_QR_PUBLIC_BASE_URL must be HTTPS mobile URL');
  }
  if (b.SAFE_APP_ENV && b.SAFE_APP_ENV !== 'staging') {
    errors.push('backend SAFE_APP_ENV should be staging');
  }
  if (b.SAFE_DISABLE_DEFAULT_ADMIN !== 'true') {
    errors.push('backend SAFE_DISABLE_DEFAULT_ADMIN should be true on staging');
  }
  ok('backend .env present');
}

if (mobile.missing) {
  errors.push('Missing apps/mobile/.env — copy from apps/mobile/.env.staging.example');
} else {
  const m = mobile.vars;
  if (!m.VITE_API_BASE_URL?.startsWith('https://')) {
    errors.push('mobile VITE_API_BASE_URL must be HTTPS staging API');
  }
  if (m.VITE_API_BASE_URL?.includes('127.0.0.1') || m.VITE_API_BASE_URL?.includes('localhost')) {
    errors.push('mobile VITE_API_BASE_URL must not be localhost on staging');
  }
  if (m.VITE_CLAIMS_QA_CAPTURE === 'true' || m.VITE_QR_QA_CAPTURE === 'true') {
    errors.push('mobile QA capture flags must be false on staging');
  }
  ok('mobile .env present');
}

if (dashboard.missing) {
  errors.push('Missing apps/dashboard/.env — copy from apps/dashboard/.env.staging.example');
} else {
  const d = dashboard.vars;
  if (!d.VITE_API_BASE_URL?.startsWith('https://')) {
    errors.push('dashboard VITE_API_BASE_URL must be HTTPS staging API');
  }
  if (d.VITE_API_BASE_URL !== mobile.vars?.VITE_API_BASE_URL && !dashboard.missing && !mobile.missing) {
    errors.push('dashboard and mobile VITE_API_BASE_URL must match');
  }
  ok('dashboard .env present');
}

if (errors.length) {
  for (const e of errors) fail(e);
  process.exit(1);
}

console.log('\nStaging env validation passed.');
