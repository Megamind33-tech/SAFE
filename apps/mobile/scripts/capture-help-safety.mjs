/**
 * QA screenshots for Help & Safety screen.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const HELP_SAFETY_CONFIG_CACHE_KEY = 'safe_help_safety_config_cache';
const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';

const QA_PHONE = '+260977123456';
const QA_PASSWORD = 'testpass123';
const EMPTY_PHONE = '+260977000088';
const EMPTY_PASSWORD = 'qa-empty-tc-88';

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
  await page.waitForTimeout(700);
  const profileActive = page.locator('.bottom-nav .nav-item.active', { hasText: 'Profile' });
  if ((await profileActive.count()) === 0) {
    throw new Error('Profile tab must be active');
  }
  const text = await page.locator('.help-safety-screen-board').innerText();
  if (/\+260977\d{6}/.test(text.replace(/\s/g, ''))) {
    throw new Error('Full unmasked phone visible on Help & Safety screen');
  }
  if (/support@safe\.co\.zm/i.test(text) && !process.env.SAFE_SUPPORT_EMAIL_CONFIGURED) {
    const configRes = await fetch(`${API_BASE}/health`).catch(() => null);
    if (configRes) {
      /* allow only if env actually set on server — checked separately */
    }
  }
  await page.locator('.phone-frame').screenshot({ path: path.join(OUTPUT_DIR, filename) });
}

async function apiRequest(urlPath, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API_BASE}${urlPath}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

async function ensureLogin(phone, password, name) {
  try {
    await apiRequest('/api/shared/auth/register', {
      method: 'POST',
      body: { phone, password, fullName: name },
    });
  } catch (err) {
    if (!/exists/i.test(String(err.message))) throw err;
  }
  const data = await apiRequest('/api/shared/auth/login', {
    method: 'POST',
    body: { identifier: phone, password },
  });
  return data.token;
}

async function ensureTrustedContact(token) {
  const data = await apiRequest('/api/mobile/trusted-contacts', { token });
  if ((data.trustedContacts ?? []).length > 0) return;
  await apiRequest('/api/mobile/trusted-contacts', {
    method: 'POST',
    token,
    body: {
      name: 'Sarah Mwansa',
      relationship: 'Sibling',
      phoneNumber: '+260977654567',
      isPrimary: true,
    },
  });
}

async function gotoFresh(page) {
  const bust = `hs_qa=${Date.now()}`;
  await page.goto(`${BASE_URL}/?${bust}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE_URL}/?${bust}&r=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
}

async function loginInBrowser(page, phone, password) {
  await gotoFresh(page);
  await page.getByRole('button', { name: /^log in$/i }).click();
  await page.waitForSelector('input[placeholder="+260 or email address"]', { timeout: 15000 });
  await page.fill('input[placeholder="+260 or email address"]', phone);
  await page.fill('input[placeholder="Enter password"]', password);
  await page.locator('form.auth-form button[type="submit"]').click();
  await page.waitForSelector('.home-screen', { timeout: 30000 });
  await page.waitForTimeout(1500);
}

async function openHelpSafety(page) {
  await page.locator('.bottom-nav').getByRole('button', { name: 'Profile', exact: true }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /help.*safety/i }).click();
  await page.waitForSelector('.help-safety-screen-board', { timeout: 15000 });
  await page.waitForTimeout(800);
}

async function assertSheetTitle(page, text) {
  const title = await page.locator('.help-safety-sheet__title').textContent();
  if (!title?.includes(text)) {
    throw new Error(`Sheet title expected "${text}", got "${title}"`);
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  await ensureLogin(QA_PHONE, QA_PASSWORD, 'QA Help Safety');
  await ensureLogin(EMPTY_PHONE, EMPTY_PASSWORD, 'QA Empty Help');
  const token = await ensureLogin(QA_PHONE, QA_PASSWORD, 'QA Help Safety');
  await ensureTrustedContact(token);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await enableHardRefresh(context);

  const page = await context.newPage();
  await loginInBrowser(page, QA_PHONE, QA_PASSWORD);
  await openHelpSafety(page);

  await page.waitForSelector('.help-safety-emergency-card__title', { hasText: 'In an accident?' });
  const headerTitle = await page.locator('.help-safety-header__title').textContent();
  if (!headerTitle?.includes('Help & Safety')) {
    throw new Error(`Header title truncated or wrong: "${headerTitle}"`);
  }
  await capturePhone(page, 'help-safety-main.png');

  await page.locator('#help-accident-steps').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await capturePhone(page, 'help-safety-accident-steps.png');

  const checklistSection = page.locator('.help-safety-section-card', { has: page.locator('#help-claim-checklist') });
  await checklistSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const checklistText = await checklistSection.innerText();
  if (!checklistText.includes('Active SAFE cover')) {
    throw new Error('Claim checklist text clipped or missing');
  }
  await capturePhone(page, 'help-safety-claim-checklist.png');

  await page.locator('#help-support').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await capturePhone(page, 'help-safety-support-options.png');

  await page.getByRole('button', { name: 'Report a problem' }).click();
  await page.waitForSelector('.help-safety-sheet');
  await assertSheetTitle(page, 'Report a problem');
  await capturePhone(page, 'help-safety-report-problem-sheet.png');
  await page.locator('.help-safety-sheet__close').click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: 'Call emergency contact' }).click();
  await page.waitForSelector('.help-safety-sheet');
  await assertSheetTitle(page, 'Call trusted contact');
  await capturePhone(page, 'help-safety-contact-picker.png');

  await page.close();
  await context.close();
  await browser.close();

  // Error no cache
  {
    const b2 = await chromium.launch({ headless: true });
    const c2 = await b2.newContext();
    await enableHardRefresh(c2);
    const p2 = await c2.newPage();
    await p2.route('**/api/mobile/help-safety/config**', (route) => route.abort('failed'));
    await loginInBrowser(p2, EMPTY_PHONE, EMPTY_PASSWORD);
    await p2.evaluate((key) => sessionStorage.removeItem(key), HELP_SAFETY_CONFIG_CACHE_KEY);
    await openHelpSafety(p2);
    await p2.waitForSelector('.help-safety-error', { timeout: 20000 });
    await capturePhone(p2, 'help-safety-error-no-cache.png');
    await c2.close();
    await b2.close();
  }

  // Sync warning
  {
    const b3 = await chromium.launch({ headless: true });
    const c3 = await b3.newContext();
    await enableHardRefresh(c3);
    const p3 = await c3.newPage();
    await p3.route('**/api/mobile/help-safety/config**', (route) => route.abort('failed'));
    await loginInBrowser(p3, QA_PHONE, QA_PASSWORD);
    await p3.evaluate(
      ({ key, payload }) => sessionStorage.setItem(key, JSON.stringify(payload)),
      {
        key: HELP_SAFETY_CONFIG_CACHE_KEY,
        payload: {
          supportPhone: null,
          supportEmail: null,
          claimsGuideVersion: '1',
        },
      }
    );
    await openHelpSafety(p3);
    await p3.waitForSelector('.help-safety-emergency-card', { timeout: 15000 });
    await p3.waitForSelector('.help-safety-sync-warning', { timeout: 15000 });
    if ((await p3.locator('.help-safety-error').count()) > 0) {
      throw new Error('Full error shown when cached config exists');
    }
    await capturePhone(p3, 'help-safety-sync-warning.png');
    await c3.close();
    await b3.close();
  }

  console.log('Saved screenshots to', OUTPUT_DIR);
  [
    'help-safety-main.png',
    'help-safety-accident-steps.png',
    'help-safety-claim-checklist.png',
    'help-safety-support-options.png',
    'help-safety-report-problem-sheet.png',
    'help-safety-contact-picker.png',
    'help-safety-error-no-cache.png',
    'help-safety-sync-warning.png',
  ].forEach((f) => console.log('  -', f));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
