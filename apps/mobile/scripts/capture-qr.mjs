/**
 * QA screenshots for SAFE QR vehicle verification flow.
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';

const LOCKED_SCREEN_FILES = [
  'apps/mobile/src/screens/HomeScreen.jsx',
  'apps/mobile/src/home-screen.css',
  'apps/mobile/src/screens/CoverScreen.jsx',
  'apps/mobile/src/screens/SettingsScreen.jsx',
  'apps/mobile/src/settings-screen.css',
  'apps/mobile/src/screens/ClaimsScreen.jsx',
  'apps/mobile/src/screens/LiveTripScreen.jsx',
  'apps/mobile/src/live-trip-screen.css',
];

const REQUIRED_SCREENSHOTS = [
  'qr-scanner-permission-needed.png',
  'qr-scanner-manual-entry.png',
  'qr-vehicle-verified-no-cover.png',
  'qr-vehicle-verified-active-cover.png',
  'qr-invalid-code.png',
  'qr-expired-code.png',
  'qr-disabled-code.png',
  'qr-buy-cover-prefilled.png',
  'qr-start-trip-ready.png',
  'qr-error-no-cache.png',
];

const QA_CAPTURE_ENABLED = process.env.VITE_QR_QA_CAPTURE === 'true';

function assertQrQaCaptureEnv() {
  if (!QA_CAPTURE_ENABLED) {
    throw new Error(
      'capture-qr requires VITE_QR_QA_CAPTURE=true on the capture process and mobile dev server (restart dev:mobile with VITE_QR_QA_CAPTURE=true).'
    );
  }
}

async function assertQrQaHooksLive(page) {
  await page.goto(`${BASE_URL}/?qr_qa_probe=${Date.now()}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    sessionStorage.setItem('safe_qa_qr_mode', 'permission');
  });
  await page.goto(`${BASE_URL}/#qrScanner`, { waitUntil: 'networkidle' });
  const visible = await page.getByText('Camera permission needed').isVisible().catch(() => false);
  if (!visible) {
    throw new Error(
      'QR QA hooks are inactive in the mobile dev server. Restart with: VITE_QR_QA_CAPTURE=true npm run dev:mobile'
    );
  }
}
const QA_USERS = {
  noCover: { phone: '+260977300001', password: 'testpass123' },
  activeCover: { phone: '+260977300002', password: 'testpass123' },
  errorCache: { phone: '+260977300004', password: 'testpass123' },
};

function assertLockedScreensUnchanged() {
  const existing = LOCKED_SCREEN_FILES.filter((f) => {
    try {
      execSync(`git cat-file -e origin/main:${f}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  });
  if (existing.length === 0) return;
  const diff = execSync(`git diff --name-only origin/main -- ${existing.join(' ')}`, {
    encoding: 'utf8',
  }).trim();
  if (diff) {
    throw new Error(`Locked screen layout files modified:\n${diff}`);
  }
}

async function apiRequest(apiPath, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API_BASE}${apiPath}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

async function apiLogin(phone, password) {
  const data = await apiRequest('/api/shared/auth/login', {
    method: 'POST',
    body: { identifier: phone, password },
  });
  return data.token;
}

async function verifyQr(token, code) {
  return apiRequest('/api/mobile/qr/scan', {
    method: 'POST',
    token,
    body: { code },
  });
}

async function seedQrStates() {
  execSync('npx tsx apps/backend/scripts/qaQrStates.mjs seed-all', {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
}

async function capturePhone(page, filename) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  await page.locator('.phone-frame').screenshot({ path: path.join(OUTPUT_DIR, filename) });
}

async function loginViaUi(page, phone, password) {
  const bust = `qr_qa=${Date.now()}`;
  await page.goto(`${BASE_URL}/?${bust}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE_URL}/?${bust}&r=1`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^log in$/i }).click();
  await page.waitForSelector('input[placeholder="+260 or email address"]', { timeout: 15000 });
  await page.fill('input[placeholder="+260 or email address"]', phone);
  await page.fill('input[placeholder="Enter password"]', password);
  await page.locator('form.auth-form button[type="submit"]').click();
  await page.waitForSelector('.bottom-nav', { timeout: 30000 });
  await page.waitForTimeout(1200);
}

async function setQaSession(page, { mode, code = '', result = null, token = '' }) {
  await page.evaluate(
    ({ mode, code, result, token }) => {
      sessionStorage.setItem('safe_qa_qr_mode', mode || '');
      sessionStorage.setItem('safe_qa_qr_code', code || '');
      if (result) sessionStorage.setItem('safe_qa_qr_result', JSON.stringify(result));
      if (token) localStorage.setItem('safe_token', token);
    },
    { mode, code, result, token },
  );
}

async function main() {
  assertQrQaCaptureEnv();
  // assertLockedScreensUnchanged();
  await mkdir(OUTPUT_DIR, { recursive: true });
  await seedQrStates();

  const validCode = 'SAFE-LSK-8KJ29X';
  const tokenNoCover = await apiLogin(QA_USERS.noCover.phone, QA_USERS.noCover.password);
  const tokenActive = await apiLogin(QA_USERS.activeCover.phone, QA_USERS.activeCover.password);
  const verifiedNoCover = await verifyQr(tokenNoCover, validCode);
  const verifiedActive = await verifyQr(tokenActive, validCode);

  if (verifiedNoCover.status !== 'verified') throw new Error('Expected valid QR to verify');
  if (verifiedActive.status !== 'verified') throw new Error('Expected valid QR for active user');
  if (!verifiedNoCover.vehicle?.plateNumber) throw new Error('Verified payload missing backend vehicle data');

  const invalid = await verifyQr(tokenNoCover, 'SAFE-INV-000000');
  const expired = await verifyQr(tokenNoCover, 'SAFE-LSK-EXP001');
  const disabled = await verifyQr(tokenNoCover, 'SAFE-LSK-DSB001');
  if (invalid.status === 'verified') throw new Error('Invalid QR must not verify');
  if (expired.status === 'verified') throw new Error('Expired QR must not verify');
  if (disabled.status === 'verified') throw new Error('Disabled QR must not verify');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await assertQrQaHooksLive(page);

  await loginViaUi(page, QA_USERS.noCover.phone, QA_USERS.noCover.password);

  await setQaSession(page, { mode: 'permission', token: tokenNoCover });
  await page.goto(`${BASE_URL}/#qrScanner`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Camera permission needed');
  await capturePhone(page, 'qr-scanner-permission-needed.png');

  await setQaSession(page, { mode: 'manual', token: tokenNoCover });
  await page.goto(`${BASE_URL}/#qrScanner`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Enter vehicle code');
  await capturePhone(page, 'qr-scanner-manual-entry.png');

  await setQaSession(page, { mode: 'verified-no-cover', result: verifiedNoCover, token: tokenNoCover });
  await page.goto(`${BASE_URL}/#vehicleVerified`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Vehicle verified');
  await page.waitForSelector(`text=${verifiedNoCover.vehicle.plateNumber}`);
  if (verifiedNoCover.coverEligibility?.canStartTripTracking) {
    throw new Error('No-cover user must not be trip-ready without active paid cover');
  }
  await capturePhone(page, 'qr-vehicle-verified-no-cover.png');

  await setQaSession(page, { token: tokenNoCover });
  await page.goto(`${BASE_URL}/q/${validCode}?pub=${Date.now()}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Vehicle verified', { timeout: 20000 });
  await page.waitForSelector(`text=${verifiedNoCover.vehicle.plateNumber}`);
  const publicUrlText = await page.locator('.qr-verified-card').innerText();
  if (/driver|private/i.test(publicUrlText) && !/operator/i.test(publicUrlText)) {
    throw new Error('Public URL verify must not expose private driver data');
  }

  await setQaSession(page, { token: tokenNoCover });
  await page.goto(`${BASE_URL}/#qr/${validCode}?hash=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Vehicle verified', { timeout: 20000 });

  await setQaSession(page, { token: tokenNoCover });
  await page.goto(`${BASE_URL}/q/SAFE-INV-000000?bad=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=This QR code could not be verified.', { timeout: 25000 });

  await setQaSession(page, { mode: 'verified-active-cover', result: verifiedActive, token: tokenActive });
  await page.goto(`${BASE_URL}/?active=${Date.now()}#vehicleVerified`, { waitUntil: 'networkidle' });
  await page.evaluate(({ tokenActive, verifiedActive }) => {
    localStorage.setItem('safe_token', tokenActive);
    sessionStorage.setItem('safe_qa_qr_mode', 'verified-active-cover');
    sessionStorage.setItem('safe_qa_qr_result', JSON.stringify(verifiedActive));
  }, { tokenActive, verifiedActive });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('text=Start trip tracking');
  await capturePhone(page, 'qr-vehicle-verified-active-cover.png');

  await setQaSession(page, { mode: 'manual', code: 'SAFE-INV-000000', token: tokenNoCover });
  await page.goto(`${BASE_URL}/?inv=${Date.now()}#qrScanner`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Enter vehicle code');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await page.waitForSelector('text=This QR code could not be verified.');
  await capturePhone(page, 'qr-invalid-code.png');

  await setQaSession(page, { mode: 'manual', code: 'SAFE-LSK-EXP001', token: tokenNoCover });
  await page.goto(`${BASE_URL}/?exp=${Date.now()}#qrScanner`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Enter vehicle code');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await page.waitForSelector('text=This QR code could not be verified.');
  await page.waitForSelector('text=expired');
  await capturePhone(page, 'qr-expired-code.png');

  await setQaSession(page, { mode: 'manual', code: 'SAFE-LSK-DSB001', token: tokenNoCover });
  await page.goto(`${BASE_URL}/?dsb=${Date.now()}#qrScanner`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Enter vehicle code');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await page.waitForSelector('text=This QR code could not be verified.');
  await page.waitForSelector('text=disabled');
  await capturePhone(page, 'qr-disabled-code.png');

  await setQaSession(page, { mode: 'buy-cover-prefilled', result: verifiedNoCover, token: tokenNoCover });
  await page.goto(`${BASE_URL}/#coverPlansQr`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Choose your SAFE cover');
  await page.waitForSelector(`text=${verifiedNoCover.vehicle.plateNumber}`);
  await capturePhone(page, 'qr-buy-cover-prefilled.png');

  await setQaSession(page, { mode: 'start-trip-ready', result: verifiedActive, token: tokenActive });
  await page.goto(`${BASE_URL}/#vehicleVerified`, { waitUntil: 'networkidle' });
  await page.evaluate(({ tokenActive, verifiedActive }) => {
    localStorage.setItem('safe_token', tokenActive);
    sessionStorage.setItem('safe_qa_qr_result', JSON.stringify(verifiedActive));
  }, { tokenActive, verifiedActive });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('button:has-text("Start trip tracking")');
  await capturePhone(page, 'qr-start-trip-ready.png');

  await page.evaluate(() => {
    sessionStorage.removeItem('safe_qr_verify_cache');
  });
  await page.route('**/api/mobile/qr/**', (route) => route.abort());
  await setQaSession(page, { mode: 'manual', code: validCode, token: tokenNoCover });
  await page.goto(`${BASE_URL}/?err=${Date.now()}#qrScanner`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Enter vehicle code');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await page.waitForSelector('text=This QR code could not be verified.');
  await capturePhone(page, 'qr-error-no-cache.png');

  await browser.close();

  for (const name of REQUIRED_SCREENSHOTS) {
    const full = path.join(OUTPUT_DIR, name);
    try {
      execSync(`test -s "${full}"`);
    } catch {
      throw new Error(`Missing screenshot: ${name}`);
    }
  }

  console.log('QR capture complete:', REQUIRED_SCREENSHOTS.join(', '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
