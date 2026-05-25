/**
 * QA screenshots for Payment Methods (locked UI — capture logic only).
 *
 * Cache key: safe_payment_methods_cache (sessionStorage)
 * Empty QA user: +260977000099 / qa-empty-pm-99
 * Saved QA user: +260977123456 / testpass123
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
/** Must match PAYMENT_METHODS_CACHE_KEY in src/services/paymentMethods.js */
const PAYMENT_METHODS_CACHE_KEY = 'safe_payment_methods_cache';

const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';

/** Dedicated QA user with zero payment methods (API + no session cache). */
const EMPTY_QA_PHONE = '+260977000099';
const EMPTY_QA_PASSWORD = 'qa-empty-pm-99';
const EMPTY_QA_NAME = 'QA Empty Payment Methods';

/** QA user with saved Airtel Money (+260 97 *** 3456). */
const SAVED_QA_PHONE = '+260977123456';
const SAVED_QA_PASSWORD = 'testpass123';

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

async function assertCurrentPaymentMethodsCss(page) {
  const card = page.locator('.payment-method-card--default').first();
  await card.waitFor({ timeout: 15000 });
  const layout = await card.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const pill = el.querySelector('.payment-method-card__pill--default');
    const pillStyle = pill ? window.getComputedStyle(pill) : null;
    const title = el.querySelector('.payment-method-card__title');
    const subtitle = el.querySelector('.payment-method-card__subtitle');
    return {
      display: style.display,
      gridTemplateColumns: style.gridTemplateColumns,
      pillGridRow: pillStyle?.gridRow || '',
      titleText: title?.textContent?.trim() || '',
      phoneText: subtitle?.textContent?.trim() || '',
    };
  });
  if (layout.display !== 'grid') {
    throw new Error(
      `Stale CSS: default card display is "${layout.display}", expected "grid". Restart Vite and clear cache.`
    );
  }
  if (!layout.titleText.includes('Airtel Money')) {
    throw new Error(`Expected Airtel Money title, got "${layout.titleText}"`);
  }
  if (!/\+260 97 \*\*\* 3456/.test(layout.phoneText)) {
    throw new Error(`Expected full masked phone, got "${layout.phoneText}"`);
  }
  if (layout.pillGridRow !== '2') {
    throw new Error(`Default badge grid-row is "${layout.pillGridRow}", expected "2" (below phone).`);
  }
}

async function capturePhone(page, filename) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  await page.locator('.phone-frame').screenshot({ path: path.join(OUTPUT_DIR, filename) });
}

async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

async function ensureQaUser(phone, password, fullName) {
  try {
    await apiRequest('/api/shared/auth/register', {
      method: 'POST',
      body: { phone, password, fullName },
    });
  } catch (err) {
    if (!/already exists|exists/i.test(String(err.message))) {
      throw err;
    }
  }
}

async function apiLogin(phone, password) {
  const data = await apiRequest('/api/shared/auth/login', {
    method: 'POST',
    body: { identifier: phone, password },
  });
  return data.token;
}

async function apiDeleteAllPaymentMethods(token) {
  const data = await apiRequest('/api/mobile/payment-methods', { token });
  const methods = data.paymentMethods ?? [];
  for (const method of methods) {
    await apiRequest(`/api/mobile/payment-methods/${method.id}`, {
      method: 'DELETE',
      token,
    });
  }
  return methods.length;
}

async function apiEnsureAirtelSaved(token) {
  const data = await apiRequest('/api/mobile/payment-methods', { token });
  const methods = data.paymentMethods ?? [];
  const airtel = methods.find((m) => m.type === 'airtel_money');
  if (airtel) return methods;

  await apiRequest('/api/mobile/payment-methods', {
    method: 'POST',
    token,
    body: { provider: 'airtel', phoneNumber: '+260977123456' },
  });
  return apiRequest('/api/mobile/payment-methods', { token }).then((d) => d.paymentMethods ?? []);
}

function mapApiToCachedMethod(method) {
  const provider =
    method.type === 'airtel_money'
      ? 'airtel'
      : method.type === 'mtn_mobile_money'
        ? 'mtn'
        : 'visa_mastercard';
  return {
    id: method.id,
    type: provider === 'airtel' || provider === 'mtn' ? 'mobile_money' : 'card',
    provider,
    label: method.label,
    displayName: method.label,
    maskedValue: method.maskedValue,
    maskedPhone: method.maskedValue,
    isDefault: Boolean(method.isDefault),
    status: method.status || 'active',
  };
}

async function clearPaymentMethodsCache(page) {
  await page.evaluate((key) => {
    sessionStorage.removeItem(key);
  }, PAYMENT_METHODS_CACHE_KEY);
}

async function seedPaymentMethodsCache(page, methods) {
  await page.evaluate(
    ({ key, payload }) => {
      sessionStorage.setItem(key, JSON.stringify(payload));
    },
    { key: PAYMENT_METHODS_CACHE_KEY, payload: methods }
  );
}

async function gotoFresh(page) {
  const bust = `pm_qa=${Date.now()}`;
  await page.goto(`${BASE_URL}/?${bust}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE_URL}/?${bust}&reload=1`, { waitUntil: 'networkidle' });
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

async function openPaymentMethods(page) {
  await page.locator('.bottom-nav').getByRole('button', { name: 'Profile', exact: true }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /payment methods/i }).click();
  await page.waitForSelector('.payment-methods-screen-board', { timeout: 15000 });
  await page.waitForTimeout(900);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log('Payment Methods QA capture');
  console.log('  Cache key:', PAYMENT_METHODS_CACHE_KEY);
  console.log('  Empty user:', EMPTY_QA_PHONE);
  console.log('  Saved user:', SAVED_QA_PHONE);

  await ensureQaUser(EMPTY_QA_PHONE, EMPTY_QA_PASSWORD, EMPTY_QA_NAME);
  await ensureQaUser(SAVED_QA_PHONE, SAVED_QA_PASSWORD, 'QA Saved Airtel');

  const emptyToken = await apiLogin(EMPTY_QA_PHONE, EMPTY_QA_PASSWORD);
  const deleted = await apiDeleteAllPaymentMethods(emptyToken);
  console.log(`  Cleared ${deleted} payment method(s) from empty QA user via API`);

  const savedToken = await apiLogin(SAVED_QA_PHONE, SAVED_QA_PASSWORD);
  await apiEnsureAirtelSaved(savedToken);
  const savedApiMethods = await apiRequest('/api/mobile/payment-methods', { token: savedToken });
  const cachedSeed = (savedApiMethods.paymentMethods ?? []).map(mapApiToCachedMethod);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await enableHardRefresh(context);

  // 1. True empty state — empty user, API [], cache cleared before PM screen
  {
    const page = await context.newPage();
    await loginInBrowser(page, EMPTY_QA_PHONE, EMPTY_QA_PASSWORD);
    await clearPaymentMethodsCache(page);
    await openPaymentMethods(page);
    await page.waitForSelector('.payment-methods-empty', { timeout: 20000 });
    await page.locator('.payment-methods-empty__title', { hasText: 'No payment method added' }).waitFor({
      timeout: 10000,
    });
    const hasList = await page.locator('.payment-methods-list').count();
    if (hasList > 0) {
      throw new Error('Empty capture failed: saved method list is still visible');
    }
    await capturePhone(page, 'payment-methods-empty.png');
    await page.close();
  }

  // 2–4. Saved user flows
  {
    const page = await context.newPage();
    await loginInBrowser(page, SAVED_QA_PHONE, SAVED_QA_PASSWORD);
    await openPaymentMethods(page);
    await page.waitForSelector('.payment-method-card--default', { timeout: 20000 });
    await assertCurrentPaymentMethodsCss(page);
    await capturePhone(page, 'payment-methods-saved-airtel.png');

    await page.getByRole('button', { name: 'Add payment method' }).first().click();
    await page.waitForSelector('.payment-methods-sheet', { timeout: 10000 });
    await page.waitForTimeout(600);
    const sheetTitle = await page.locator('.payment-methods-sheet__title').textContent();
    if (!sheetTitle?.includes('Add payment method')) {
      throw new Error(`Sheet title truncated or wrong: "${sheetTitle}"`);
    }
    const visaRow = page.locator('.payment-methods-sheet__option--cards');
    const visaLayout = await visaRow.evaluate((el) => {
      const badge = el.querySelector('.payment-methods-sheet__coming-soon');
      const textCol = el.querySelector('.payment-methods-sheet__option-text');
      if (!badge || !textCol) return { ok: false };
      return { ok: textCol.contains(badge) };
    });
    if (!visaLayout.ok) {
      throw new Error('Visa row: Coming soon must be inside the text column (below Card payment).');
    }
    await capturePhone(page, 'payment-methods-add-sheet.png');

    await page.getByRole('button', { name: /Airtel Money/i }).click();
    await page.fill('#mobile-money-phone', '+260977123456');
    await page.getByRole('button', { name: 'Save method' }).click();
    await page.waitForSelector('.payment-methods-sheet__field-notice', { timeout: 10000 });
    await page.waitForTimeout(600);
    await capturePhone(page, 'payment-methods-duplicate-number.png');
    await page.close();
  }

  await context.close();
  await browser.close();

  // 5. Error — no cache
  {
    const browser2 = await chromium.launch({ headless: true });
    const context2 = await browser2.newContext();
    await enableHardRefresh(context2);
    const page = await context2.newPage();
    await page.route('**/api/mobile/payment-methods**', (route) => route.abort('failed'));
    await loginInBrowser(page, EMPTY_QA_PHONE, EMPTY_QA_PASSWORD);
    await clearPaymentMethodsCache(page);
    await openPaymentMethods(page);
    await page.waitForSelector('.payment-methods-error', { timeout: 20000 });
    const hasList = await page.locator('.payment-methods-list').count();
    if (hasList > 0) {
      throw new Error('Error-no-cache capture failed: list should not appear');
    }
    await capturePhone(page, 'payment-methods-error-no-cache.png');
    await context2.close();
    await browser2.close();
  }

  // 6. Sync warning — cached saved card, API refresh failed
  {
    const browser3 = await chromium.launch({ headless: true });
    const context3 = await browser3.newContext();
    await enableHardRefresh(context3);
    const page = await context3.newPage();
    await page.route('**/api/mobile/payment-methods**', (route) => route.abort('failed'));
    await loginInBrowser(page, SAVED_QA_PHONE, SAVED_QA_PASSWORD);
    await seedPaymentMethodsCache(page, cachedSeed);
    await openPaymentMethods(page);
    await page.waitForSelector('.payment-method-card--default', { timeout: 20000 });
    await page.waitForSelector('.payment-methods-sync-warning', { timeout: 15000 });
    const hasError = await page.locator('.payment-methods-error').count();
    if (hasError > 0) {
      throw new Error('Sync-warning capture failed: full error card must not show');
    }
    await assertCurrentPaymentMethodsCss(page);
    await capturePhone(page, 'payment-methods-sync-warning.png');
    await context3.close();
    await browser3.close();
  }

  console.log('Saved screenshots to', OUTPUT_DIR);
  console.log('  - payment-methods-empty.png');
  console.log('  - payment-methods-saved-airtel.png');
  console.log('  - payment-methods-sync-warning.png');
  console.log('  - payment-methods-error-no-cache.png');
  console.log('  - payment-methods-add-sheet.png');
  console.log('  - payment-methods-duplicate-number.png');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
