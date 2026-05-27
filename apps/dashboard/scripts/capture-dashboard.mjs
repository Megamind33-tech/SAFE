/**
 * Dashboard QA screenshots — requires backend + dashboard dev servers and seeded admin.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://127.0.0.1:5174';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';

const FAKE_PATTERNS = [
  /Lusaka Transit Veins/i,
  /Live Radar/i,
  /fake revenue/i,
  /demo passenger/i,
  /placeholder stats/i,
];

async function apiLogin(identifier = 'admin@safe.local', password = 'admin1234') {
  const res = await fetch(`${API_BASE}/api/shared/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Login failed');
  return data.token;
}

async function capture(page, filename) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(600);
  const bodyText = await page.locator('body').innerText();
  for (const pattern of FAKE_PATTERNS) {
    if (pattern.test(bodyText)) {
      throw new Error(`Fake/demo content detected on ${filename}: ${pattern}`);
    }
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, filename), fullPage: true });
  console.log('saved', filename);
}

(async () => {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const token = await apiLogin();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript((t) => {
    localStorage.setItem('safe_dashboard_token', t);
  }, token);
  const page = await context.newPage();

  const shots = [
    ['dashboard-login.png', '/login'],
    ['dashboard-overview.png', '/'],
    ['dashboard-vehicles-list.png', '/vehicles'],
    ['dashboard-partners-list.png', '/partners'],
    ['dashboard-covers-list.png', '/covers'],
    ['dashboard-payments-list.png', '/payments'],
    ['dashboard-claims-queue.png', '/claims'],
    ['dashboard-live-trips.png', '/live-trips'],
    ['dashboard-qr-scans.png', '/qr-scans'],
    ['dashboard-support-reports.png', '/support'],
    ['dashboard-users-list.png', '/users'],
    ['dashboard-settings.png', '/settings'],
  ];

  for (const [file, route] of shots) {
    await page.goto(`${DASHBOARD_URL}${route}`, { waitUntil: 'networkidle' });
    await capture(page, file);
  }

  // Vehicle detail + QR panel
  await page.goto(`${DASHBOARD_URL}/vehicles`, { waitUntil: 'networkidle' });
  const firstRow = page.locator('tbody tr').first();
  if (await firstRow.count()) {
    await firstRow.click();
    await page.waitForTimeout(800);
    await capture(page, 'dashboard-vehicle-detail.png');
    await capture(page, 'dashboard-vehicle-qr.png');
  } else {
    await capture(page, 'dashboard-empty-state.png');
    await capture(page, 'dashboard-vehicle-detail.png');
    await capture(page, 'dashboard-vehicle-qr.png');
  }

  // Claim detail if any
  await page.goto(`${DASHBOARD_URL}/claims`, { waitUntil: 'networkidle' });
  const claimRow = page.locator('tbody tr').first();
  if (await claimRow.count()) {
    await claimRow.click();
    await page.waitForTimeout(600);
    await capture(page, 'dashboard-claim-detail.png');
  } else {
    await capture(page, 'dashboard-claim-detail.png');
  }

  // Error state: invalid API token
  await context.clearCookies();
  await page.evaluate(() => localStorage.setItem('safe_dashboard_token', 'invalid-token'));
  await page.goto(`${DASHBOARD_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await capture(page, 'dashboard-error-state.png');

  // Staff users (super admin)
  await page.goto(`${DASHBOARD_URL}/staff`, { waitUntil: 'networkidle' });
  await capture(page, 'dashboard-staff-list.png');
  await page.getByRole('button', { name: /add staff user/i }).click();
  await page.waitForTimeout(400);
  await capture(page, 'dashboard-staff-create.png');

  // Access restricted — support agent on payments
  const supportToken = await apiLogin('support@safe.local', 'staffqa123');
  await context.clearCookies();
  await page.evaluate((t) => localStorage.setItem('safe_dashboard_token', t), supportToken);
  await page.goto(`${DASHBOARD_URL}/payments`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await capture(page, 'dashboard-access-restricted.png');

  // Staff edit panel (back to admin)
  const adminAgain = await apiLogin();
  await page.evaluate((t) => localStorage.setItem('safe_dashboard_token', t), adminAgain);
  await page.goto(`${DASHBOARD_URL}/staff`, { waitUntil: 'networkidle' });
  const editBtn = page.getByRole('button', { name: /^edit$/i }).first();
  if (await editBtn.count()) {
    await editBtn.click();
    await page.waitForTimeout(400);
    await capture(page, 'dashboard-staff-edit-role.png');
  } else {
    await capture(page, 'dashboard-staff-edit-role.png');
  }

  await browser.close();
  console.log('Dashboard capture complete');
})();
