/**
 * QA screenshots for Settings screen.
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const SETTINGS_CACHE_KEY = 'safe_settings_cache';
const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';

const QA_PHONE = '+260977123456';
const QA_PASSWORD = 'testpass123';
const EMPTY_QA_PHONE = '+260977000066';
const EMPTY_QA_PASSWORD = 'qa-empty-settings-66';

const LOCKED_SCREEN_FILES = [
  'apps/mobile/src/screens/PaymentMethodsScreen.jsx',
  'apps/mobile/src/payment-methods-screen.css',
  'apps/mobile/src/screens/TrustedContactsScreen.jsx',
  'apps/mobile/src/trusted-contacts-screen.css',
  'apps/mobile/src/screens/NotificationsScreen.jsx',
  'apps/mobile/src/notifications-screen.css',
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

async function capturePhone(page, filename) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  const profileActive = page.locator('.bottom-nav .nav-item.active', { hasText: 'Profile' });
  if ((await profileActive.count()) === 0) {
    throw new Error('Profile tab must be active');
  }
  await page.locator('.phone-frame').screenshot({ path: path.join(OUTPUT_DIR, filename) });
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

async function apiGetSettingsBundle(token) {
  const config = await apiRequest('/api/mobile/settings/config', { token });
  const account = await apiRequest('/api/mobile/settings/account', { token });
  return { config: config.config, account: account.account };
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

async function openSettings(page) {
  await page.locator('.bottom-nav').getByRole('button', { name: 'Profile', exact: true }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /settings/i }).click();
  await page.waitForSelector('.settings-screen-board', { timeout: 15000 });
  await page.waitForTimeout(700);
}

async function assertNoFullPhone(page) {
  const text = await page.locator('.settings-screen-board').innerText();
  if (/\+260977\d{6}/.test(text.replace(/\s/g, ''))) {
    throw new Error('Full unmasked phone number visible on settings screen');
  }
}

async function assertSheetTitleNotTruncated(page) {
  const title = page.locator('#settings-sheet-title');
  if ((await title.count()) === 0) return;
  const truncated = await title.evaluate((el) => el.scrollWidth > el.clientWidth + 2);
  if (truncated) {
    throw new Error('Sheet title truncates horizontally');
  }
}

async function main() {
  assertLockedScreensUnchanged();
  await mkdir(OUTPUT_DIR, { recursive: true });

  await ensureQaUser(EMPTY_QA_PHONE, EMPTY_QA_PASSWORD, 'QA Empty Settings');
  await ensureQaUser(QA_PHONE, QA_PASSWORD, 'QA Settings');

  const savedToken = await apiLogin(QA_PHONE, QA_PASSWORD);
  const cachedBundle = await apiGetSettingsBundle(savedToken);

  if (!cachedBundle.config?.legalLinks?.terms) {
    /* expected without env URLs */
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await enableHardRefresh(context);
  const page = await context.newPage();

  await loginInBrowser(page, QA_PHONE, QA_PASSWORD);
  await page.evaluate((key) => sessionStorage.removeItem(key), SETTINGS_CACHE_KEY);
  await openSettings(page);
  await page.waitForSelector('.settings-card', { timeout: 20000 });
  await assertNoFullPhone(page);
  await capturePhone(page, 'settings-main.png');

  await page.getByRole('button', { name: 'Personal details' }).click();
  await page.waitForSelector('#settings-sheet-title', { hasText: 'Personal details' });
  await assertSheetTitleNotTruncated(page);
  await capturePhone(page, 'settings-personal-details.png');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: 'Login and security' }).click();
  await page.waitForSelector('#settings-sheet-title', { hasText: 'Login and security' });
  await capturePhone(page, 'settings-login-security.png');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: 'Data and privacy' }).click();
  await page.waitForSelector('#settings-sheet-title', { hasText: 'Data and privacy' });
  await capturePhone(page, 'settings-privacy-sheet.png');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: 'Terms of service' }).click();
  await page.waitForSelector('.settings-inline-notice', {
    hasText: 'Terms link not configured yet.',
    timeout: 10000,
  });
  await capturePhone(page, 'settings-legal-not-configured.png');

  await page.getByRole('button', { name: 'Delete account' }).click();
  await page.waitForSelector('#settings-sheet-title', { hasText: 'Delete account?' });
  await capturePhone(page, 'settings-delete-step-one.png');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForSelector('#settings-sheet-title', { hasText: 'Confirm deletion' });
  const deleteBtn = page.locator('.settings-sheet__btn--destructive', { hasText: 'Delete account' });
  if (!(await deleteBtn.isDisabled())) {
    throw new Error('Delete account must be disabled until DELETE is typed');
  }
  await capturePhone(page, 'settings-delete-confirm-disabled.png');

  await page.fill('#settings-delete-confirm', 'DELETE');
  await deleteBtn.click();
  await page.waitForSelector('.settings-sheet__notice', {
    hasText: 'Account deletion is not connected yet.',
    timeout: 10000,
  });
  await capturePhone(page, 'settings-delete-not-connected.png');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForSelector('#settings-sheet-title', { hasText: 'Sign out?' });
  await capturePhone(page, 'settings-logout-confirm.png');

  await page.close();
  await context.close();
  await browser.close();

  {
    const browser2 = await chromium.launch({ headless: true });
    const context2 = await browser2.newContext();
    await enableHardRefresh(context2);
    const page2 = await context2.newPage();
    await page2.route('**/api/mobile/settings/**', (route) => route.abort('failed'));
    await loginInBrowser(page2, EMPTY_QA_PHONE, EMPTY_QA_PASSWORD);
    await page2.evaluate((key) => sessionStorage.removeItem(key), SETTINGS_CACHE_KEY);
    await openSettings(page2);
    await page2.waitForSelector('.settings-error', { timeout: 20000 });
    if ((await page2.locator('.settings-card').count()) > 0) {
      throw new Error('Settings cards visible on full error without cache');
    }
    await capturePhone(page2, 'settings-error-no-cache.png');
    await context2.close();
    await browser2.close();
  }

  {
    const browser3 = await chromium.launch({ headless: true });
    const context3 = await browser3.newContext();
    await enableHardRefresh(context3);
    const page3 = await context3.newPage();
    await page3.route('**/api/mobile/settings/**', (route) => route.abort('failed'));
    await loginInBrowser(page3, QA_PHONE, QA_PASSWORD);
    await page3.evaluate(
      ({ key, payload }) => sessionStorage.setItem(key, JSON.stringify(payload)),
      { key: SETTINGS_CACHE_KEY, payload: cachedBundle }
    );
    await openSettings(page3);
    await page3.waitForSelector('.settings-card', { timeout: 15000 });
    await page3.waitForSelector('.settings-sync-warning', { timeout: 15000 });
    if ((await page3.locator('.settings-error').count()) > 0) {
      throw new Error('Full error shown while cached settings exist');
    }
    await capturePhone(page3, 'settings-sync-warning.png');
    await context3.close();
    await browser3.close();
  }

  console.log('Saved screenshots to', OUTPUT_DIR);
  [
    'settings-main.png',
    'settings-personal-details.png',
    'settings-login-security.png',
    'settings-privacy-sheet.png',
    'settings-legal-not-configured.png',
    'settings-delete-step-one.png',
    'settings-delete-confirm-disabled.png',
    'settings-delete-not-connected.png',
    'settings-logout-confirm.png',
    'settings-error-no-cache.png',
    'settings-sync-warning.png',
  ].forEach((f) => console.log('  -', f));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
