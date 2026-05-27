/**
 * Responsive layout captures for mobile — verifies no overflow / nav overlap at key widths.
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';
const PASS = 'testpass123';

const SHOTS = [
  { file: 'responsive-mobile-home-360.png', width: 360, route: 'home', phone: '+260977400001' },
  { file: 'responsive-mobile-cover-360.png', width: 360, route: 'cover', phone: '+260977400001' },
  { file: 'responsive-mobile-claims-360.png', width: 360, route: 'claims', phone: '+260977123457' },
  { file: 'responsive-mobile-qr-360.png', width: 360, route: 'qr', phone: '+260977400004' },
  { file: 'responsive-mobile-payment-methods-360.png', width: 360, route: 'payment-methods', phone: '+260977400005' },
  { file: 'responsive-mobile-home-390.png', width: 390, route: 'home', phone: '+260977400001' },
  { file: 'responsive-mobile-cover-390.png', width: 390, route: 'cover', phone: '+260977400001' },
  { file: 'responsive-mobile-claims-390.png', width: 390, route: 'claims', phone: '+260977123457' },
  { file: 'responsive-mobile-live-trip-390.png', width: 390, route: 'live-trip', phone: '+260977123458' },
  { file: 'responsive-mobile-home-430.png', width: 430, route: 'home', phone: '+260977400001' },
  { file: 'responsive-mobile-cover-430.png', width: 430, route: 'cover', phone: '+260977400001' },
  { file: 'responsive-mobile-settings-430.png', width: 430, route: 'settings', phone: '+260977400007' },
];

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

async function ensureUser(phone, fullName) {
  try {
    await apiRequest('/api/shared/auth/register', {
      method: 'POST',
      body: { phone, password: PASS, fullName },
    });
  } catch (err) {
    if (!/already exists|exists/i.test(String(err.message))) throw err;
  }
}

function seedClaims() {
  execSync('node scripts/qaClaimsSeed.mjs list', {
    cwd: '/workspace/apps/backend',
    stdio: 'inherit',
  });
}

function seedLiveTrip() {
  execSync('node scripts/qaTripStates.mjs active-route', {
    cwd: '/workspace/apps/backend',
    stdio: 'inherit',
  });
}

async function loginViaUi(page, phone) {
  await page.goto(`${BASE_URL}/?qa=${Date.now()}`, { waitUntil: 'networkidle' });
  if (await page.locator('.home-command-center, .cover-flow, .claims-screen-board').count()) {
    return;
  }
  const loginBtn = page.getByRole('button', { name: /^log in$/i });
  if (await loginBtn.count()) {
    await loginBtn.click();
  }
  await page.waitForSelector('input[placeholder="+260 or email address"]', { timeout: 15000 });
  await page.fill('input[placeholder="+260 or email address"]', phone);
  await page.fill('input[placeholder="Enter password"]', PASS);
  await page.locator('form.auth-form button[type="submit"]').click();
  await page.waitForSelector('.bottom-nav', { timeout: 30000 });
  await page.waitForTimeout(1200);
}

async function assertMobileLayout(page, label) {
  const issues = await page.evaluate(() => {
    const found = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth + 1) {
      found.push('page horizontal overflow');
    }
    const frame = document.querySelector('.phone-frame');
    if (frame && frame.scrollWidth > frame.clientWidth + 1) {
      found.push('phone-frame horizontal overflow');
    }
    const nav = document.querySelector('.bottom-nav');
    if (nav) {
      const navTop = nav.getBoundingClientRect().top;
      const selectors = [
        '.home-hero__actions button',
        '.cover-flow-btn--primary',
        '.claims-btn--primary',
        '.claims-start-cta',
        '.qr-btn--primary',
        '.qr-actions button',
        '.payment-methods-btn--primary',
      ];
      for (const sel of selectors) {
        for (const el of document.querySelectorAll(sel)) {
          const rect = el.getBoundingClientRect();
          if (rect.height < 2 || rect.width < 2) continue;
          if (rect.bottom > navTop - 4 && rect.top < navTop) {
            found.push(`CTA overlaps bottom nav (${sel})`);
            break;
          }
        }
      }
    }
    const scanner = document.querySelector('.qr-scanner-frame');
    if (scanner) {
      const rect = scanner.getBoundingClientRect();
      if (rect.right > window.innerWidth + 1 || rect.left < -1) {
        found.push('QR scanner overflows viewport');
      }
    }
    return found;
  });
  if (issues.length) {
    throw new Error(`${label}: ${issues.join('; ')}`);
  }
}

async function navigateRoute(page, route) {
  if (route === 'home') {
    await page.locator('.bottom-nav').getByRole('button', { name: 'Home', exact: true }).click();
    await page.waitForSelector('.home-command-center', { timeout: 20000 });
  } else if (route === 'cover') {
    await page.locator('.bottom-nav').getByRole('button', { name: 'Cover', exact: true }).click();
    await page.waitForSelector('.cover-flow', { timeout: 20000 });
  } else if (route === 'claims') {
    await page.locator('.bottom-nav').getByRole('button', { name: 'Claims', exact: true }).click();
    await page.waitForSelector('.claims-screen-board', { timeout: 20000 });
  } else if (route === 'qr') {
    await page.locator('.bottom-nav').getByRole('button', { name: 'Profile', exact: true }).click();
    await page.waitForSelector('.profile-screen-board', { timeout: 20000 });
    await page.getByRole('button', { name: 'Scan vehicle QR' }).click();
    await page.waitForSelector('.qr-screen', { timeout: 20000 });
  } else if (route === 'payment-methods') {
    await page.locator('.bottom-nav').getByRole('button', { name: 'Profile', exact: true }).click();
    await page.waitForSelector('.profile-screen-board', { timeout: 20000 });
    await page.getByRole('button', { name: 'Payment methods' }).click();
    await page.waitForSelector('.payment-methods-screen', { timeout: 20000 });
  } else if (route === 'live-trip') {
    await page.goto(`${BASE_URL}/#liveTrip`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.live-trip-screen', { timeout: 20000 });
  } else if (route === 'settings') {
    await page.locator('.bottom-nav').getByRole('button', { name: 'Profile', exact: true }).click();
    await page.waitForSelector('.profile-screen-board', { timeout: 20000 });
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForSelector('.settings-screen-board', { timeout: 20000 });
  }
}

async function captureShot(page, shot) {
  const { file, width, route, phone } = shot;
  await page.setViewportSize({ width, height: 844 });
  await loginViaUi(page, phone);
  await navigateRoute(page, route);
  await page.waitForTimeout(700);
  await assertMobileLayout(page, file);
  await page.locator('.phone-frame').screenshot({ path: path.join(OUTPUT_DIR, file) });
  console.log('saved', file);
}

(async () => {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const phones = [...new Set(SHOTS.map((s) => s.phone))];
  for (const phone of phones) {
    await ensureUser(phone, `Responsive QA ${phone.slice(-4)}`);
  }
  seedClaims();
  seedLiveTrip();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const shot of SHOTS) {
    await captureShot(page, shot);
  }

  await browser.close();
  console.log(`Mobile responsive capture: ${SHOTS.length}/${SHOTS.length} passed`);
})();
