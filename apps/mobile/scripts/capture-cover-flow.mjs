/**
 * QA screenshots for Cover / Buy Cover flow (12 states, fail-fast assertions).
 */
import { chromium } from 'playwright';
import { execSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const COVER_CACHE_KEY = 'safe_cover_screen_cache';
const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';
const BACKEND_ENV_PATH = '/workspace/apps/backend/.env';

const REQUIRED_SCREENSHOTS = [
  'cover-active.png',
  'cover-no-active-plans.png',
  'cover-plan-selected.png',
  'cover-review.png',
  'cover-payment-methods.png',
  'cover-payment-pending.png',
  'cover-payment-failed.png',
  'cover-activated.png',
  'cover-expired.png',
  'cover-error-no-cache.png',
  'cover-sync-warning.png',
  'cover-payment-not-configured.png',
];

const LOCKED_SCREEN_FILES = [
  'apps/mobile/src/screens/HomeScreen.jsx',
  'apps/mobile/src/home-screen.css',
  'apps/mobile/src/screens/SettingsScreen.jsx',
  'apps/mobile/src/settings-screen.css',
  'apps/mobile/src/screens/PaymentMethodsScreen.jsx',
  'apps/mobile/src/payment-methods-screen.css',
  'apps/mobile/src/screens/CoverHistoryScreen.jsx',
  'apps/mobile/src/screens/ClaimsScreen.jsx',
];

const PASS = 'testpass123';
const PHONE_ACTIVE = '+260977200001';
const PHONE_EMPTY = '+260977200002';
const PHONE_BUY = '+260977200003';
const PHONE_PENDING = '+260977200004';
const PHONE_FAILED = '+260977200005';
const PHONE_EXPIRED = '+260977200006';
const PHONE_ERROR = '+260977200007';
const PHONE_SYNC = '+260977200008';
const PHONE_NOT_CFG = '+260977200009';
const PHONE_ACTIVATED = '+260977200010';

const QA_ENV_DEFAULT = {
  SAFE_PAYMENT_GATEWAY_ENABLED: 'true',
  SAFE_PAYMENT_SIMULATE_SUCCESS: 'false',
  SAFE_CARD_PAYMENTS_ENABLED: 'false',
  SAFE_ALLOW_COVER_STACKING: 'false',
  SAFE_CLAIMS_UPLOAD_ENABLED: 'false',
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
  const unstaged = execSync(`git diff --name-only HEAD -- ${existing.join(' ')}`, {
    encoding: 'utf8',
  }).trim();
  const staged = execSync(`git diff --name-only --cached HEAD -- ${existing.join(' ')}`, {
    encoding: 'utf8',
  }).trim();
  const diff = [unstaged, staged].filter(Boolean).join('\n');
  if (diff) throw new Error(`Locked screen files modified in this session:\n${diff}`);
}

function readEnvFile() {
  try {
    return readFileSync(BACKEND_ENV_PATH, 'utf8');
  } catch {
    return '';
  }
}

function setBackendEnv(vars) {
  const lines = readEnvFile()
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('#'));
  const map = new Map(
    lines.map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
  );
  for (const [k, v] of Object.entries(vars)) map.set(k, v);
  writeFileSync(
    BACKEND_ENV_PATH,
    `${[...map.entries()].map(([k, v]) => `${k}=${v}`).join('\n')}\n`,
  );
}

async function waitForBackend(maxMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Backend did not become healthy');
}

function killBackend() {
  try {
    execSync('tmux -f /exec-daemon/tmux.portal.conf send-keys -t "safe-backend-dev:0.0" C-c 2>/dev/null || true', {
      stdio: 'ignore',
    });
    execSync('pkill -f "tsx watch src/index.ts" 2>/dev/null || true', { stdio: 'ignore' });
    execSync('fuser -k 8080/tcp 2>/dev/null || true', { stdio: 'ignore' });
  } catch {
    /* ignore */
  }
}

async function ensurePortFree() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) return;
      killBackend();
      await new Promise((r) => setTimeout(r, 1500));
    } catch {
      return;
    }
  }
  throw new Error('Port 8080 still in use after backend shutdown');
}

let backendProc = null;

async function restartBackend(envOverrides = {}) {
  setBackendEnv({ ...QA_ENV_DEFAULT, ...envOverrides });
  killBackend();
  await ensurePortFree();
  await new Promise((r) => setTimeout(r, 1000));
  if (backendProc) {
    try {
      backendProc.kill();
    } catch {
      /* ignore */
    }
  }
  backendProc = spawn('npm', ['run', 'dev:backend'], {
    cwd: '/workspace',
    detached: true,
    stdio: 'ignore',
  });
  backendProc.unref();
  await waitForBackend();
}

async function apiRequest(apiPath, { method = 'GET', token, body, allowStatuses = [] } = {}) {
  const res = await fetch(`${API_BASE}${apiPath}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !allowStatuses.includes(res.status)) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return { data, status: res.status };
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
  const { data } = await apiRequest('/api/shared/auth/login', {
    method: 'POST',
    body: { identifier: phone, password },
  });
  return data.token;
}

async function apiLoginResilient(phone, password) {
  let lastErr;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await apiLogin(phone, password);
    } catch (err) {
      lastErr = err;
      await waitForBackend(15000);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastErr;
}

function qaPayment(command, arg) {
  execSync(`npx tsx apps/backend/scripts/qaCoverPayment.mjs ${command} ${arg}`, {
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
    if (!/already exists|already saved|409/i.test(String(err.message))) throw err;
  }
  const { data: list } = await apiRequest('/api/mobile/payment-methods', { token });
  const methods = list.paymentMethods ?? [];
  return methods.find((m) => m.isDefault) ?? methods[0];
}

function isCoverActiveApi(cover) {
  if (!cover) return false;
  if (cover.status === 'pending' || cover.paymentStatus === 'pending') return false;
  if (cover.endsAt && new Date(cover.endsAt) <= new Date()) return false;
  return cover.status === 'active';
}


async function stubPaymentMethodsRoute(page, token) {
  const { data } = await apiRequest('/api/mobile/payment-methods', { token });
  const body = JSON.stringify({ paymentMethods: data.paymentMethods ?? [] });
  await page.route('**/api/mobile/payment-methods', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body });
  });
}

async function captureCover(page, filename) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  if ((await page.locator('.bottom-nav .nav-item.active', { hasText: 'Cover' }).count()) === 0) {
    throw new Error('Cover tab must be active');
  }
  await page.locator('.phone-frame').screenshot({ path: path.join(OUTPUT_DIR, filename) });
}

async function login(page, phone, password) {
  await page.goto(`${BASE_URL}/?qa=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^log in$/i }).click();
  await page.fill('input[placeholder="+260 or email address"]', phone);
  await page.fill('input[placeholder="Enter password"]', password);
  await page.locator('form.auth-form button[type="submit"]').click();
  await page.waitForSelector('.home-screen, .cover-flow', { timeout: 30000 });
  await page.waitForFunction(
    () => Boolean(localStorage.getItem('safe_token')),
    { timeout: 15000 },
  );
  const token = await page.evaluate(() => localStorage.getItem('safe_token'));
  if (token) {
    try {
      const { data: list } = await apiRequest('/api/mobile/payment-methods', { token });
      const methods = (list.paymentMethods ?? []).map((m) => ({
        id: m.id,
        type: m.type === 'card' ? 'card' : 'mobile_money',
        provider: m.type === 'airtel_money' ? 'airtel' : m.type === 'mtn_mobile_money' ? 'mtn' : 'airtel',
        label: m.label || m.displayName || 'Payment method',
        maskedPhone: m.maskedValue ?? m.maskedPhone,
        isDefault: Boolean(m.isDefault),
        status: 'active',
      }));
      await page.evaluate(
        ({ key, methods }) => sessionStorage.setItem(key, JSON.stringify(methods)),
        { key: 'safe_payment_methods_cache', methods },
      );
    } catch {
      /* ignore */
    }
  }
  await page.waitForTimeout(1200);
}

async function goCoverTab(page) {
  await page.locator('.bottom-nav').getByRole('button', { name: 'Cover', exact: true }).click();
  await page.waitForSelector('.cover-flow', { timeout: 15000 });
  await page.waitForTimeout(800);
}

async function buyFlowToPayment(page, token) {
  if (token) await stubPaymentMethodsRoute(page, token);
  await page.getByRole('button', { name: /choose cover/i }).click();
  await page.waitForSelector('.cover-flow-plan-card', { timeout: 15000 });
  await page.locator('.cover-flow-plan-card').first().click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  await page.waitForSelector('.cover-flow-review-card', { timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: /continue to payment|choose payment method/i }).click();
  await page.waitForSelector('h1.cover-flow-header__title', { hasText: /^Payment$/, timeout: 20000 });
  await page.waitForSelector('.cover-flow__loading', { state: 'detached', timeout: 30000 }).catch(() => {});  await page.waitForSelector('.cover-flow-method-card', { timeout: 60000 });
  await page.locator('.cover-flow-method-card').first().click();
}

async function confirmPurchaseAndGetPaymentId(page) {
  await page.waitForSelector('.cover-flow-method-card--selected', { timeout: 15000 });
  const responsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/mobile/cover/purchase') && res.request().method() === 'POST',
    { timeout: 20000 },
  );
  await page.getByRole('button', { name: /confirm purchase/i }).click();
  const response = await responsePromise;
  const body = await response.json();
  return body?.purchase?.id ?? null;
}

async function assertNoNegativeTimer(page) {
  const activeHero = page.locator('.cover-flow-hero--active');
  if ((await activeHero.count()) === 0) return;
  const timeRow = activeHero
    .locator('.cover-flow-hero__details div')
    .filter({ has: page.locator('dt', { hasText: 'Time remaining' }) })
    .locator('dd');
  const t = (await timeRow.textContent())?.trim() ?? '';
  if (/-\d+\s*(m|h|s)/i.test(t) || /-\d+:/.test(t)) {
    throw new Error(`Timer shows negative value: "${t}"`);
  }
}

async function assertNoActiveCoverHero(page) {
  if ((await page.locator('.cover-flow-hero--active').count()) > 0) {
    throw new Error('Active cover hero must not appear for this state');
  }
}

async function startPurchaseViaApi(token, planId = 'plus') {
  const method = await addPaymentMethod(token);
  const { data } = await apiRequest('/api/mobile/cover/purchase', {
    method: 'POST',
    token,
    body: {
      planId,
      paymentMethodId: method.id,
      startMode: 'after_payment_confirmation',
    },
    allowStatuses: [501],
  });
  return data;
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
}

async function main() {
  assertLockedScreensUnchanged();
  await mkdir(OUTPUT_DIR, { recursive: true });
  setBackendEnv(QA_ENV_DEFAULT);
  await restartBackend(QA_ENV_DEFAULT);

  for (const [phone, name] of [
    [PHONE_ACTIVE, 'QA Cover Active'],
    [PHONE_EMPTY, 'QA Cover Empty'],
    [PHONE_BUY, 'QA Cover Buy'],
    [PHONE_PENDING, 'QA Cover Pending'],
    [PHONE_FAILED, 'QA Cover Failed'],
    [PHONE_EXPIRED, 'QA Cover Expired'],
    [PHONE_ERROR, 'QA Cover Error'],
    [PHONE_SYNC, 'QA Cover Sync'],
    [PHONE_NOT_CFG, 'QA Cover Not Configured'],
    [PHONE_ACTIVATED, 'QA Cover Activated'],
  ]) {
    await ensureQaUser(phone, PASS, name);
  }

  for (const phone of [PHONE_ACTIVE, PHONE_EMPTY, PHONE_BUY, PHONE_PENDING, PHONE_FAILED, PHONE_EXPIRED, PHONE_NOT_CFG, PHONE_ACTIVATED]) {
    qaPayment('clear-covers', phone);
  }

  const tokenActive = await apiLoginResilient(PHONE_ACTIVE, PASS);
  const purchaseActive = await startPurchaseViaApi(tokenActive);
  if (purchaseActive.purchase?.id) qaPayment('succeed', purchaseActive.purchase.id);

  for (const phone of [PHONE_BUY, PHONE_PENDING, PHONE_FAILED, PHONE_NOT_CFG]) {
    await addPaymentMethod(await apiLoginResilient(phone, PASS));
  }
  qaPayment('seed-expired', PHONE_EXPIRED);

  const tokenSync = await apiLoginResilient(PHONE_SYNC, PASS);
  const { data: syncPlans } = await apiRequest('/api/mobile/cover/plans', { token: tokenSync });
  const { data: syncActive } = await apiRequest('/api/mobile/cover/active', { token: tokenSync });
  const cachedBundle = {
    plans: syncPlans.plans,
    capabilities: syncPlans.capabilities,
    activeCover: syncActive.cover,
    lastEndedCover: syncActive.lastEndedCover,
    pendingCover: syncActive.pendingCover,
  };

  let browser = await chromium.launch({ headless: true });

  {
    const page = await browser.newPage();
    await login(page, PHONE_ACTIVE, PASS);
    await goCoverTab(page);
    await page.waitForSelector('.cover-flow-hero--active', { timeout: 20000 });
    await assertNoNegativeTimer(page);
    await captureCover(page, 'cover-active.png');
    await page.close();
  }

  {
    const page = await browser.newPage();
    await login(page, PHONE_EMPTY, PASS);
    await goCoverTab(page);
    await page.waitForSelector('.cover-flow-start', { timeout: 20000 });
    await assertNoActiveCoverHero(page);
    await captureCover(page, 'cover-no-active-plans.png');
    await page.close();
  }

  {
    const page = await browser.newPage();
    await login(page, PHONE_EMPTY, PASS);
    await goCoverTab(page);
    await page.getByRole('button', { name: /choose cover/i }).click();
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
    const reviewPayment = await page.locator('.cover-flow-review-card__rows dd').last().textContent();
    if (!/Airtel Money|Payment method required/i.test(reviewPayment || '')) {
      throw new Error(`Review must show default payment or required message, got: ${reviewPayment}`);
    }
    await captureCover(page, 'cover-review.png');
    await page.close();
  }

  await browser.close();
  browser = await chromium.launch({ headless: true });

  {
    const page = await browser.newPage();
    await login(page, PHONE_BUY, PASS);
    await goCoverTab(page);
    await buyFlowToPayment(page, await apiLogin(PHONE_BUY, PASS));
    await captureCover(page, 'cover-payment-methods.png');
    await page.close();
  }

  {
    const page = await browser.newPage();
    await login(page, PHONE_PENDING, PASS);
    await goCoverTab(page);
    await buyFlowToPayment(page, await apiLogin(PHONE_PENDING, PASS));
    const paymentId = await confirmPurchaseAndGetPaymentId(page);
    await page.waitForSelector('h2:has-text("Payment pending")', { timeout: 20000 });
    await assertNoActiveCoverHero(page);
    const { data: activeRes } = await apiRequest('/api/mobile/cover/active', {
      token: await apiLogin(PHONE_PENDING, PASS),
    });
    if (isCoverActiveApi(activeRes.cover)) {
      throw new Error('Payment pending must not activate cover');
    }
    if (!paymentId) throw new Error('Expected purchase payment id');
    await captureCover(page, 'cover-payment-pending.png');
    await page.close();
  }

  {
    const page = await browser.newPage();
    await login(page, PHONE_FAILED, PASS);
    await goCoverTab(page);
    await buyFlowToPayment(page, await apiLogin(PHONE_FAILED, PASS));
    const paymentId = await confirmPurchaseAndGetPaymentId(page);
    if (!paymentId) throw new Error('Expected purchase payment id for failed flow');
    qaPayment('fail', paymentId);
    await page.waitForSelector('h2:has-text("Payment failed")', { timeout: 30000 });
    await assertNoActiveCoverHero(page);
    await captureCover(page, 'cover-payment-failed.png');
    await page.close();
  }

  {
    const page = await browser.newPage();
    const token = await apiLogin(PHONE_ACTIVATED, PASS);
    await addPaymentMethod(token);
    await login(page, PHONE_ACTIVATED, PASS);
    await goCoverTab(page);
    await buyFlowToPayment(page, token);
    const paymentId = await confirmPurchaseAndGetPaymentId(page);
    await page.waitForSelector('h2:has-text("Payment pending")', { timeout: 20000 });
    if (paymentId) {
      qaPayment('succeed', paymentId);
      const { data: statusData } = await apiRequest(`/api/mobile/cover/purchase/${paymentId}/status`, { token });
      await page.route(`**/api/mobile/cover/purchase/${paymentId}/status`, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(statusData),
        }),
      );
    }
    await page.getByRole('button', { name: /check status/i }).click({ force: true });
    await page.waitForSelector('.cover-flow-status-card--success', { timeout: 25000 });
    const { data: activeRes } = await apiRequest('/api/mobile/cover/active', { token });
    if (!isCoverActiveApi(activeRes.cover)) {
      throw new Error('Cover activated requires backend active cover');
    }
    await captureCover(page, 'cover-activated.png');
    await page.close();
  }

  {
    const page = await browser.newPage();
    await login(page, PHONE_EXPIRED, PASS);
    await goCoverTab(page);
    await page.waitForSelector('.cover-flow-hero--expired', { timeout: 20000 });
    await assertNoActiveCoverHero(page);
    await assertNoNegativeTimer(page);
    const { data: activeRes } = await apiRequest('/api/mobile/cover/active', {
      token: await apiLogin(PHONE_EXPIRED, PASS),
    });
    if (isCoverActiveApi(activeRes.cover)) {
      throw new Error('Expired cover must not be active in API');
    }
    await captureCover(page, 'cover-expired.png');
    await page.close();
  }

  await browser.close();

  {
    const browser2 = await chromium.launch({ headless: true });
    const context = await browser2.newContext();
    await enableHardRefresh(context);
    const page = await context.newPage();
    await page.route('**/api/mobile/cover/**', (route) => route.abort('failed'));
    await login(page, PHONE_ERROR, PASS);
    await page.evaluate((key) => sessionStorage.removeItem(key), COVER_CACHE_KEY);
    await goCoverTab(page);
    await page.waitForSelector('.cover-flow--error', { timeout: 20000 });
    await captureCover(page, 'cover-error-no-cache.png');
    await browser2.close();
  }

  {
    const browser3 = await chromium.launch({ headless: true });
    const context = await browser3.newContext();
    await enableHardRefresh(context);
    const page = await context.newPage();
    await page.route('**/api/mobile/cover/**', (route) => route.abort('failed'));
    await login(page, PHONE_SYNC, PASS);
    await page.evaluate(
      ({ key, payload }) => sessionStorage.setItem(key, JSON.stringify(payload)),
      { key: COVER_CACHE_KEY, payload: cachedBundle },
    );
    await goCoverTab(page);
    await page.waitForSelector('.cover-flow-sync-warning', { timeout: 20000 });
    if ((await page.locator('.cover-flow--error').count()) > 0) {
      throw new Error('Full error shown while cached cover/plans exist');
    }
    await captureCover(page, 'cover-sync-warning.png');
    await browser3.close();
  }

  await restartBackend({ SAFE_PAYMENT_GATEWAY_ENABLED: 'false' });

  const tokenNotCfg = await apiLogin(PHONE_NOT_CFG, PASS);
  const method = await addPaymentMethod(tokenNotCfg);
  const { data: notCfg, status } = await apiRequest('/api/mobile/cover/purchase', {
    method: 'POST',
    token: tokenNotCfg,
    body: {
      planId: 'plus',
      paymentMethodId: method.id,
      startMode: 'after_payment_confirmation',
    },
    allowStatuses: [501],
  });
  if (notCfg.purchase?.status !== 'not_configured' && status !== 501) {
    throw new Error('Gateway disabled must return not_configured purchase');
  }
  const notCfgBody = JSON.stringify(notCfg);

  const browser4 = await chromium.launch({ headless: true });
  const page = await browser4.newPage();
  await page.route('**/api/mobile/payment-methods', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const { data } = await apiRequest('/api/mobile/payment-methods', { token: tokenNotCfg });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.route('**/api/mobile/cover/purchase', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({ status: 501, contentType: 'application/json', body: notCfgBody });
  });
  await login(page, PHONE_NOT_CFG, PASS);
  await goCoverTab(page);
  await buyFlowToPayment(page, tokenNotCfg);
  await page.getByRole('button', { name: /confirm purchase/i }).click();
  await page.waitForSelector('text=Payment provider is not connected yet', { timeout: 25000 });
  await assertNoActiveCoverHero(page);
  const { data: activeRes } = await apiRequest('/api/mobile/cover/active', { token: tokenNotCfg });
  if (activeRes.cover) throw new Error('not_configured must not create active cover');
  await captureCover(page, 'cover-payment-not-configured.png');
  await browser4.close();

  await restartBackend(QA_ENV_DEFAULT);

  const saved = await readdir(OUTPUT_DIR);
  for (const name of REQUIRED_SCREENSHOTS) {
    if (!saved.includes(name)) throw new Error(`Missing required screenshot: ${name}`);
  }

  console.log('Saved screenshots to', OUTPUT_DIR);
  for (const name of REQUIRED_SCREENSHOTS) console.log(' -', name);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
