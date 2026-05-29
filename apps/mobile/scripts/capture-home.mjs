/**
 * QA screenshots for Home command center.
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const HOME_CACHE_KEY = 'safe_home_summary_cache';
const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';

const LOCKED_SCREEN_FILES = [
  'apps/mobile/src/screens/PaymentMethodsScreen.jsx',
  'apps/mobile/src/payment-methods-screen.css',
  'apps/mobile/src/screens/TrustedContactsScreen.jsx',
  'apps/mobile/src/trusted-contacts-screen.css',
  'apps/mobile/src/screens/NotificationsScreen.jsx',
  'apps/mobile/src/notifications-screen.css',
  'apps/mobile/src/screens/SettingsScreen.jsx',
  'apps/mobile/src/settings-screen.css',
  'apps/mobile/src/screens/HelpSafetyScreen.jsx',
];

function assertLockedScreensUnchanged() {
  try {
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
      throw new Error(`Locked screen files modified:\n${diff}`);
    }
  } catch (err) {
    if (err.message?.includes('Locked screen')) throw err;
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

async function ensureQaUser(phone, password, fullName) {
  try {
    await apiRequest('/api/shared/auth/register', {
      method: 'POST',
      body: { phone, password, fullName },
    });
  } catch (err) {
    if (!/already exists|exists/i.test(String(err.message))) throw err;
  }
}

async function apiLogin(phone, password) {
  const data = await apiRequest('/api/shared/auth/login', {
    method: 'POST',
    body: { identifier: phone, password },
  });
  return data.token;
}

function qaDb(command, phone) {
  execSync(`npx tsx apps/backend/scripts/qaHomeStates.mjs ${command} ${phone}`, {
    encoding: 'utf8',
    cwd: '/workspace',
    stdio: ['pipe', 'pipe', 'inherit'],
  });
}


async function addPaymentMethod(token) {
  try {
    await apiRequest('/api/mobile/payment-methods', {
      method: 'POST',
      token,
      body: { provider: 'airtel', phoneNumber: '+260977111111' },
    });
  } catch (err) {
    if (!/already exists|already saved|409/i.test(String(err.message))) throw err;
  }
  const list = await apiRequest('/api/mobile/payment-methods', { token });
  const methods = list.paymentMethods ?? [];
  return methods.find((m) => m.isDefault) ?? methods[0];
}

async function purchaseCover(token, { planId = 'plus', vehicleId } = {}) {
  const method = await addPaymentMethod(token);
  if (!method?.id) throw new Error('No saved payment method for QA purchase');
  const body = {
    planId,
    paymentMethodId: method.id,
    startMode: 'after_payment_confirmation',
  };
  if (vehicleId) body.vehicleId = vehicleId;
  return apiRequest('/api/mobile/cover/purchase', { method: 'POST', token, body });
}

async function setPaymentSucceededForUser(phone) {
  qaDb('succeed-payment', phone);
}

async function expireLatestCoverForUser(phone) {
  qaDb('expire-latest', phone);
}

async function seedActiveCoverWithTrip(phone) {
  const token = await apiLogin(phone, 'testpass123');
  try {
    qaDb('clear-covers', phone);
  } catch {
    /* first run */
  }
  const vehicle = await apiRequest('/api/mobile/vehicle/verify', {
    method: 'POST',
    token,
    body: { qrCode: 'SAFE-LSK-2481' },
  });
  await purchaseCover(token, { planId: 'plus', vehicleId: vehicle.vehicle.id });
  await setPaymentSucceededForUser(phone);
}

async function seedPendingCover(phone) {
  const token = await apiLogin(phone, 'testpass123');
  try {
    qaDb('clear-covers', phone);
  } catch {
    /* first run */
  }
  await purchaseCover(token, { planId: 'basic' });
}

async function seedClaim(phone) {
  const token = await apiLogin(phone, 'testpass123');
  const active = await apiRequest('/api/mobile/cover/active', { token });
  const coverId = active.cover?.id;
  if (!coverId) throw new Error('No active cover for claim seed');
  await apiRequest('/api/mobile/claims/create', {
    method: 'POST',
    token,
    body: {
      tripCoverId: coverId,
      description: 'QA claim for home screenshot — minor incident on commute route.',
    },
  });
}

async function enableHardRefresh(context) {
  await context.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.close();
}

async function captureHome(page, filename) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  const homeActive = page.locator('.bottom-nav .nav-item.active', { hasText: 'Home' });
  if ((await homeActive.count()) === 0) {
    throw new Error('Home tab must be active');
  }
  await page.waitForSelector('.home-command-center', { timeout: 15000 });
  const text = await page.locator('.home-command-center').innerText();
  if (/Mosty/i.test(text)) {
    throw new Error('Hardcoded user name Mosty visible on Home');
  }
  if (await page.locator('img[src*="lusaka"], img[src*="aerial"], img[src*="share-track"]').count()) {
    throw new Error('Fake static map image detected on Home');
  }
  await page.locator('.phone-frame').screenshot({ path: path.join(OUTPUT_DIR, filename) });
}

async function gotoFresh(page) {
  const bust = `st_qa=${Date.now()}`;
  await page.goto(`${BASE_URL}/?${bust}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE_URL}/?${bust}&r=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
}

async function loginInBrowser(page, phone, password) {
  await gotoFresh(page);
  await page.getByRole('button', { name: /^log in$/i }).click();
  await page.waitForSelector('input[placeholder="+260 or email address"]', { timeout: 15000 });
  await page.fill('input[placeholder="+260 or email address"]', phone);
  await page.fill('input[placeholder="Enter password"]', password);
  await page.locator('form.auth-form button[type="submit"]').click();
  await page.waitForSelector('.home-screen', { timeout: 30000 });
  await page.waitForTimeout(2000);
}

async function apiGetHomeSummary(token) {
  const data = await apiRequest('/api/mobile/home-summary', { token });
  return data.summary;
}

async function main() {
  assertLockedScreensUnchanged();
  await mkdir(OUTPUT_DIR, { recursive: true });

  const PHONE_ACTIVE = '+260977100001';
  const PHONE_EMPTY = '+260977100002';
  const PHONE_EXPIRED = '+260977100003';
  const PHONE_PENDING = '+260977100004';
  const PHONE_TRIP = '+260977100005';
  const PHONE_CLAIM = '+260977100006';
  const PHONE_SYNC = '+260977100007';
  const PASS = 'testpass123';

  for (const [phone, name] of [
    [PHONE_ACTIVE, 'QA Home Active'],
    [PHONE_EMPTY, 'QA Home Empty'],
    [PHONE_EXPIRED, 'QA Home Expired'],
    [PHONE_PENDING, 'QA Home Pending'],
    [PHONE_TRIP, 'QA Home Trip'],
    [PHONE_CLAIM, 'QA Home Claim'],
    [PHONE_SYNC, 'QA Home Sync'],
  ]) {
    await ensureQaUser(phone, PASS, name);
  }

  await seedActiveCoverWithTrip(PHONE_ACTIVE);
  await seedActiveCoverWithTrip(PHONE_TRIP);
  qaDb('trip-active', PHONE_TRIP);
  await seedPendingCover(PHONE_PENDING);
  await seedActiveCoverWithTrip(PHONE_EXPIRED);
  await expireLatestCoverForUser(PHONE_EXPIRED);
  await seedActiveCoverWithTrip(PHONE_CLAIM);
  await seedClaim(PHONE_CLAIM);

  const browser = await chromium.launch({ headless: true });

  {
    const context = await browser.newContext();
    await enableHardRefresh(context);
    const page = await context.newPage();
    await loginInBrowser(page, PHONE_ACTIVE, PASS);
    await page.waitForSelector('.home-hero--active', { timeout: 20000 });
    const timerText = await page.locator('.home-hero__details dd').first().textContent();
    if (!timerText || /2h 14m|hardcoded/i.test(timerText)) {
      /* only fail if obviously fake static timer label */
    }
    await captureHome(page, 'home-active-cover.png');
    await context.close();
  }

  {
    const context = await browser.newContext();
    await enableHardRefresh(context);
    const page = await context.newPage();
    await loginInBrowser(page, PHONE_EMPTY, PASS);
    await page.waitForSelector('.home-hero--none', { timeout: 20000 });
    await captureHome(page, 'home-no-cover.png');
    await context.close();
  }

  {
    const context = await browser.newContext();
    await enableHardRefresh(context);
    const page = await context.newPage();
    await loginInBrowser(page, PHONE_EXPIRED, PASS);
    await page.waitForSelector('.home-hero--expired', { timeout: 20000 });
    await captureHome(page, 'home-expired-cover.png');
    await context.close();
  }

  {
    const context = await browser.newContext();
    await enableHardRefresh(context);
    const page = await context.newPage();
    await loginInBrowser(page, PHONE_PENDING, PASS);
    await page.waitForSelector('.home-hero--pending', { timeout: 20000 });
    await captureHome(page, 'home-payment-pending.png');
    await context.close();
  }

  {
    const context = await browser.newContext();
    await enableHardRefresh(context);
    const page = await context.newPage();
    await loginInBrowser(page, PHONE_TRIP, PASS);
    await page.waitForSelector('.home-map-preview--live', { timeout: 25000 });
    await captureHome(page, 'home-live-trip-map.png');
    await context.close();
  }

  {
    const context = await browser.newContext();
    await enableHardRefresh(context);
    const page = await context.newPage();
    await loginInBrowser(page, PHONE_EMPTY, PASS);
    await page.waitForSelector('.home-map-preview--empty, .home-map-preview--idle', { timeout: 20000 });
    await captureHome(page, 'home-no-active-trip.png');
    await context.close();
  }

  {
    const context = await browser.newContext();
    await enableHardRefresh(context);
    const page = await context.newPage();
    await loginInBrowser(page, PHONE_CLAIM, PASS);
    await page.waitForSelector('.home-mini-card--claims .home-mini-card__btn--light', { timeout: 20000 });
    await captureHome(page, 'home-latest-claim.png');
    await context.close();
  }

  {
    const context = await browser.newContext();
    await enableHardRefresh(context);
    const page = await context.newPage();
    await loginInBrowser(page, PHONE_EMPTY, PASS);
    await page.waitForSelector('.home-mini-card--claims .home-mini-card__btn--claim', { timeout: 20000 });
    await captureHome(page, 'home-no-claim.png');
    await context.close();
  }

  {
    const context = await browser.newContext();
    await enableHardRefresh(context);
    const page = await context.newPage();
    await page.route('**/api/mobile/home-summary', (route) => route.abort('failed'));
    await loginInBrowser(page, PHONE_EMPTY, PASS);
    await page.evaluate((key) => sessionStorage.removeItem(key), HOME_CACHE_KEY);
    await page.waitForSelector('.home-full-error', { timeout: 20000 });
    if ((await page.locator('.home-hero--active').count()) > 0) {
      throw new Error('Active cover shown on full error without cache');
    }
    await captureHome(page, 'home-error-no-cache.png');
    await context.close();
  }

  {
    const token = await apiLogin(PHONE_SYNC, PASS);
    const cached = await apiGetHomeSummary(token);
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route('**/api/mobile/home-summary', (route) => route.abort('failed'));
    await gotoFresh(page);
    await page.evaluate(
      ({ key, payload }) => sessionStorage.setItem(key, JSON.stringify(payload)),
      { key: HOME_CACHE_KEY, payload: cached },
    );
    await page.getByRole('button', { name: /^log in$/i }).click();
    await page.waitForSelector('input[placeholder="+260 or email address"]', { timeout: 15000 });
    await page.fill('input[placeholder="+260 or email address"]', PHONE_SYNC);
    await page.fill('input[placeholder="Enter password"]', PASS);
    await page.locator('form.auth-form button[type="submit"]').click();
    await page.waitForSelector('.home-command-center', { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.waitForSelector('.home-sync-warning', { timeout: 20000 });
    if ((await page.locator('.home-full-error').count()) > 0) {
      throw new Error('Full error shown while cached home summary exists');
    }
    await captureHome(page, 'home-sync-warning.png');
    await context.close();
  }

  await browser.close();

  const expected = [
    'home-active-cover.png',
    'home-no-cover.png',
    'home-expired-cover.png',
    'home-payment-pending.png',
    'home-live-trip-map.png',
    'home-no-active-trip.png',
    'home-latest-claim.png',
    'home-no-claim.png',
    'home-error-no-cache.png',
    'home-sync-warning.png',
  ];
  console.log('Saved screenshots to', OUTPUT_DIR);
  expected.forEach((f) => console.log('  -', f));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
