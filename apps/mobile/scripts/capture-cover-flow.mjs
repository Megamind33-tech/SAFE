/**
 * QA screenshots for Cover / Buy Cover flow.
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const COVER_CACHE_KEY = 'safe_cover_screen_cache';
const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';

const LOCKED_SCREEN_FILES = [
  'apps/mobile/src/screens/HomeScreen.jsx',
  'apps/mobile/src/home-screen.css',
  'apps/mobile/src/screens/SettingsScreen.jsx',
  'apps/mobile/src/settings-screen.css',
  'apps/mobile/src/screens/PaymentMethodsScreen.jsx',
  'apps/mobile/src/payment-methods-screen.css',
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

function qaPayment(command, paymentId) {
  execSync(`npx tsx apps/backend/scripts/qaCoverPayment.mjs ${command} ${paymentId}`, {
    cwd: '/workspace',
    stdio: 'inherit',
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
    if (!/already exists|409/i.test(String(err.message))) throw err;
  }
  const list = await apiRequest('/api/mobile/payment-methods', { token });
  return list.paymentMethods?.[0];
}

async function captureCover(page, filename) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  const coverActive = page.locator('.bottom-nav .nav-item.active', { hasText: 'Cover' });
  if ((await coverActive.count()) === 0) {
    throw new Error('Cover tab must be active');
  }
  await page.locator('.phone-frame').screenshot({ path: path.join(OUTPUT_DIR, filename) });
}

async function login(page, phone, password) {
  await page.goto(`${BASE_URL}/?qa=${Date.now()}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^log in$/i }).click();
  await page.fill('input[placeholder="+260 or email address"]', phone);
  await page.fill('input[placeholder="Enter password"]', password);
  await page.locator('form.auth-form button[type="submit"]').click();
  await page.waitForSelector('.home-screen, .cover-flow', { timeout: 30000 });
  await page.waitForTimeout(1500);
}

async function goCoverTab(page) {
  await page.locator('.bottom-nav').getByRole('button', { name: 'Cover', exact: true }).click();
  await page.waitForSelector('.cover-flow', { timeout: 15000 });
  await page.waitForTimeout(800);
}

async function main() {
  assertLockedScreensUnchanged();
  await mkdir(OUTPUT_DIR, { recursive: true });

  const PASS = 'testpass123';
  const PHONE_ACTIVE = '+260977200001';
  const PHONE_EMPTY = '+260977200002';
  const PHONE_BUY = '+260977200003';

  for (const [phone, name] of [
    [PHONE_ACTIVE, 'QA Cover Active'],
    [PHONE_EMPTY, 'QA Cover Empty'],
    [PHONE_BUY, 'QA Cover Buy'],
  ]) {
    await ensureQaUser(phone, PASS, name);
  }

  const tokenActive = await apiLogin(PHONE_ACTIVE, PASS);
  const methodActive = await addPaymentMethod(tokenActive);
  const purchaseActive = await apiRequest('/api/mobile/cover/purchase', {
    method: 'POST',
    token: tokenActive,
    body: {
      planId: 'plus',
      paymentMethodId: methodActive.id,
      startMode: 'after_payment_confirmation',
    },
  });
  if (purchaseActive.purchase?.id) {
    qaPayment('succeed', purchaseActive.purchase.id);
  }

  const browser = await chromium.launch({ headless: true });

  {
    const page = await browser.newPage();
    await login(page, PHONE_ACTIVE, PASS);
    await goCoverTab(page);
    await page.waitForSelector('.cover-flow-hero--active', { timeout: 20000 });
    await captureCover(page, 'cover-active.png');
    await page.close();
  }

  {
    const page = await browser.newPage();
    await login(page, PHONE_EMPTY, PASS);
    await goCoverTab(page);
    await page.waitForSelector('.cover-flow-start, .cover-flow-intro', { timeout: 20000 });
    await captureCover(page, 'cover-no-active-plans.png');
    await page.close();
  }

  {
    const page = await browser.newPage();
    await login(page, PHONE_EMPTY, PASS);
    await goCoverTab(page);
    await page.getByRole('button', { name: /choose cover/i }).click();
    await page.waitForSelector('.cover-flow-plan-card', { timeout: 15000 });
    await page.locator('.cover-flow-plan-card').first().click();
    await page.waitForSelector('.cover-flow-plan-card--selected', { timeout: 5000 });
    await captureCover(page, 'cover-plan-selected.png');
    await page.close();
  }

  {
    const page = await browser.newPage();
    await login(page, PHONE_BUY, PASS);
    await goCoverTab(page);
    await page.getByRole('button', { name: /choose cover/i }).click();
    await page.locator('.cover-flow-plan-card').first().click();
    await page.getByRole('button', { name: /^continue$/i }).click();
    await page.waitForSelector('.cover-flow-review-card', { timeout: 15000 });
    await captureCover(page, 'cover-review.png');
    await page.close();
  }

  {
    const page = await browser.newPage();
    await login(page, PHONE_BUY, PASS);
    await goCoverTab(page);
    await page.getByRole('button', { name: /choose cover/i }).click();
    await page.locator('.cover-flow-plan-card').first().click();
    await page.getByRole('button', { name: /^continue$/i }).click();
    await page.getByRole('button', { name: /continue to payment/i }).click();
    await page.waitForSelector('.cover-flow-method-card', { timeout: 20000 });
    await captureCover(page, 'cover-payment-methods.png');
    await page.close();
  }

  await browser.close();

  console.log('Saved screenshots to', OUTPUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
