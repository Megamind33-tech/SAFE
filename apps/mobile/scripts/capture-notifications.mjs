/**
 * QA screenshots for Notifications preferences screen.
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const NOTIFICATION_PREFERENCES_CACHE_KEY = 'safe_notification_preferences_cache';
const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';

const QA_PHONE = '+260977123456';
const QA_PASSWORD = 'testpass123';
const EMPTY_QA_PHONE = '+260977000077';
const EMPTY_QA_PASSWORD = 'qa-empty-notif-77';

const LOCKED_SCREEN_FILES = [
  'apps/mobile/src/screens/PaymentMethodsScreen.jsx',
  'apps/mobile/src/payment-methods-screen.css',
  'apps/mobile/src/screens/TrustedContactsScreen.jsx',
  'apps/mobile/src/trusted-contacts-screen.css',
];

function assertLockedScreensUnchanged() {
  try {
    const diff = execSync(`git diff --name-only origin/main -- ${LOCKED_SCREEN_FILES.join(' ')}`, {
      encoding: 'utf8',
    }).trim();
    if (diff) {
      throw new Error(`Locked screen files modified:\n${diff}`);
    }
  } catch (err) {
    if (err.message?.includes('Locked screen')) throw err;
    /* origin/main may be unavailable in some environments — skip */
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

async function apiGetPreferences(token) {
  const data = await apiRequest('/api/mobile/notification-preferences', { token });
  return data.preferences;
}

async function gotoFresh(page) {
  const bust = `notif_qa=${Date.now()}`;
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

async function openNotifications(page) {
  await page.locator('.bottom-nav').getByRole('button', { name: 'Profile', exact: true }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /notifications/i }).click();
  await page.waitForSelector('.notifications-screen-board', { timeout: 15000 });
  await page.waitForTimeout(600);
}

async function assertNoTruncatedToggleLabels(page) {
  const truncated = await page.locator('.notification-toggle-row__title').evaluateAll((nodes) =>
    nodes.filter((node) => {
      const el = node;
      return el.scrollWidth > el.clientWidth + 2;
    }).length
  );
  if (truncated > 0) {
    throw new Error('Toggle labels truncate horizontally');
  }
}

async function assertMarketingOff(page) {
  const switches = page.locator(
    'section[aria-labelledby="notifications-section-marketing"] [role="switch"]'
  );
  const count = await switches.count();
  if (count < 2) {
    throw new Error('Expected marketing section toggles');
  }
  for (let i = 0; i < count; i += 1) {
    const checked = await switches.nth(i).getAttribute('aria-checked');
    if (checked === 'true') {
      throw new Error('Marketing toggles must default off without backend override');
    }
  }
}

function mockNotificationPermission(context, permission) {
  return context.addInitScript((perm) => {
    class MockNotification {
      static get permission() {
        return perm;
      }

      static requestPermission() {
        return Promise.resolve(perm);
      }
    }
    window.Notification = MockNotification;
  }, permission);
}

async function main() {
  assertLockedScreensUnchanged();
  await mkdir(OUTPUT_DIR, { recursive: true });

  await ensureQaUser(EMPTY_QA_PHONE, EMPTY_QA_PASSWORD, 'QA Empty Notifications');
  await ensureQaUser(QA_PHONE, QA_PASSWORD, 'QA Notifications');

  const savedToken = await apiLogin(QA_PHONE, QA_PASSWORD);
  const apiPrefs = await apiGetPreferences(savedToken);
  if (apiPrefs.productUpdates || apiPrefs.offersPromotions) {
    throw new Error('API defaults must have marketing toggles off');
  }

  const browser = await chromium.launch({ headless: true });

  // Main + marketing off
  {
    const context = await browser.newContext();
    await enableHardRefresh(context);
    await mockNotificationPermission(context, 'default');
    const page = await context.newPage();
    await loginInBrowser(page, QA_PHONE, QA_PASSWORD);
    await page.evaluate((key) => sessionStorage.removeItem(key), NOTIFICATION_PREFERENCES_CACHE_KEY);
    await openNotifications(page);
    await page.waitForSelector('.notifications-section-card', { timeout: 20000 });
    await assertMarketingOff(page);
    await assertNoTruncatedToggleLabels(page);
    await capturePhone(page, 'notifications-main.png');
    await capturePhone(page, 'notifications-marketing-off.png');
    await page.close();
    await context.close();
  }

  // Permission enabled
  {
    const context = await browser.newContext();
    await enableHardRefresh(context);
    await mockNotificationPermission(context, 'granted');
    const page = await context.newPage();
    await loginInBrowser(page, QA_PHONE, QA_PASSWORD);
    await openNotifications(page);
    await page.waitForSelector('.notifications-status-card__title', {
      hasText: 'Notifications enabled',
      timeout: 15000,
    });
    const statusTitle = await page.locator('.notifications-status-card__title').first().textContent();
    if (!statusTitle?.includes('Notifications enabled')) {
      throw new Error('Permission granted must show enabled status, not fake push state');
    }
    await capturePhone(page, 'notifications-enabled-state.png');
    await page.close();
    await context.close();
  }

  // Permission off / default CTA
  {
    const context = await browser.newContext();
    await enableHardRefresh(context);
    await mockNotificationPermission(context, 'default');
    const page = await context.newPage();
    await loginInBrowser(page, QA_PHONE, QA_PASSWORD);
    await openNotifications(page);
    await page.waitForSelector('.notifications-status-card__cta', {
      hasText: 'Turn on notifications',
      timeout: 15000,
    });
    await capturePhone(page, 'notifications-permission-off.png');
    await page.close();
    await context.close();
  }

  // Loading skeleton
  {
    const context = await browser.newContext();
    await enableHardRefresh(context);
    const page = await context.newPage();
    await page.route('**/api/mobile/notification-preferences', async (route) => {
      if (route.request().method() === 'GET') {
        await new Promise((r) => setTimeout(r, 3500));
        await route.continue();
        return;
      }
      await route.continue();
    });
    await loginInBrowser(page, EMPTY_QA_PHONE, EMPTY_QA_PASSWORD);
    await page.evaluate((key) => sessionStorage.removeItem(key), NOTIFICATION_PREFERENCES_CACHE_KEY);
    await openNotifications(page);
    await page.waitForSelector('.notifications-skeleton', { timeout: 10000 });
    await capturePhone(page, 'notifications-loading.png');
    await page.close();
    await context.close();
  }

  // Save failure reverts toggle
  {
    const context = await browser.newContext();
    await enableHardRefresh(context);
    await mockNotificationPermission(context, 'granted');
    const page = await context.newPage();
    await loginInBrowser(page, QA_PHONE, QA_PASSWORD);
    await openNotifications(page);
    await page.waitForSelector('#notifications-section-important', { timeout: 20000 });

    const coverRow = page.locator('.notification-toggle-row', { hasText: 'Cover expiry reminders' });
    const coverSwitch = coverRow.locator('[role="switch"]');
    const before = await coverSwitch.getAttribute('aria-checked');

    await page.route('**/api/mobile/notification-preferences', (route) => {
      if (route.request().method() === 'PATCH') {
        route.abort('failed');
        return;
      }
      route.continue();
    });

    await coverSwitch.click();
    await page.waitForSelector('.notifications-save-warning', { timeout: 10000 });
    const after = await coverSwitch.getAttribute('aria-checked');
    if (after !== before) {
      throw new Error('Save failure did not revert toggle');
    }
    await capturePhone(page, 'notifications-save-failure.png');
    await page.close();
    await context.close();
  }

  await browser.close();

  // Error no cache
  {
    const browser2 = await chromium.launch({ headless: true });
    const context2 = await browser2.newContext();
    await enableHardRefresh(context2);
    const page = await context2.newPage();
    await page.route('**/api/mobile/notification-preferences**', (route) => route.abort('failed'));
    await loginInBrowser(page, EMPTY_QA_PHONE, EMPTY_QA_PASSWORD);
    await page.evaluate((key) => sessionStorage.removeItem(key), NOTIFICATION_PREFERENCES_CACHE_KEY);
    await openNotifications(page);
    await page.waitForSelector('.notifications-error', { timeout: 20000 });
    if ((await page.locator('.notification-toggle-row').count()) > 0) {
      throw new Error('Toggles visible on full error without cache');
    }
    await capturePhone(page, 'notifications-error-no-cache.png');
    await context2.close();
    await browser2.close();
  }

  // Sync warning with cache
  {
    const browser3 = await chromium.launch({ headless: true });
    const context3 = await browser3.newContext();
    await enableHardRefresh(context3);
    const page = await context3.newPage();
    await page.route('**/api/mobile/notification-preferences**', (route) => route.abort('failed'));
    await loginInBrowser(page, QA_PHONE, QA_PASSWORD);
    await page.evaluate(
      ({ key, payload }) => sessionStorage.setItem(key, JSON.stringify(payload)),
      { key: NOTIFICATION_PREFERENCES_CACHE_KEY, payload: apiPrefs }
    );
    await openNotifications(page);
    await page.waitForSelector('.notification-toggle-row', { timeout: 15000 });
    await page.waitForSelector('.notifications-sync-warning', { timeout: 15000 });
    if ((await page.locator('.notifications-error').count()) > 0) {
      throw new Error('Full error shown while cached preferences exist');
    }
    await capturePhone(page, 'notifications-sync-warning.png');
    await context3.close();
    await browser3.close();
  }

  console.log('Saved screenshots to', OUTPUT_DIR);
  [
    'notifications-main.png',
    'notifications-enabled-state.png',
    'notifications-permission-off.png',
    'notifications-marketing-off.png',
    'notifications-save-failure.png',
    'notifications-error-no-cache.png',
    'notifications-sync-warning.png',
    'notifications-loading.png',
  ].forEach((f) => console.log('  -', f));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
