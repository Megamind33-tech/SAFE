/**
 * Responsive layout captures for dashboard — verifies layout at key desktop/tablet widths.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://127.0.0.1:5174';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';

const SHOTS = [
  { file: 'responsive-dashboard-overview-1280.png', width: 1280, height: 800, route: '/' },
  { file: 'responsive-dashboard-overview-1440.png', width: 1440, height: 900, route: '/' },
  { file: 'responsive-dashboard-vehicles-1024.png', width: 1024, height: 768, route: '/vehicles' },
  { file: 'responsive-dashboard-vehicles-768.png', width: 768, height: 1024, route: '/vehicles' },
  { file: 'responsive-dashboard-claims-1024.png', width: 1024, height: 768, route: '/claims' },
  { file: 'responsive-dashboard-payments-768.png', width: 768, height: 1024, route: '/payments' },
  { file: 'responsive-dashboard-settings-1366.png', width: 1366, height: 768, route: '/settings' },
  { file: 'responsive-dashboard-qr-scans-1024.png', width: 1024, height: 768, route: '/qr-scans' },
];

async function apiLogin() {
  const res = await fetch(`${API_BASE}/api/shared/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@safe.local', password: 'admin1234' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Login failed');
  return data.token;
}

async function assertDashboardLayout(page, { file, width }) {
  const issues = await page.evaluate(({ viewportWidth }) => {
    const found = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth + 2) {
      found.push('page horizontal overflow outside table scroll');
    }
    const main = document.querySelector('main');
    if (main && main.scrollWidth > main.clientWidth + 2) {
      found.push('main content horizontal overflow');
    }
    if (viewportWidth < 768) {
      const menu = document.querySelector('header button[aria-label="Open navigation menu"]');
      if (!menu) found.push('mobile menu button missing');
    }
    if (viewportWidth >= 768 && viewportWidth < 1280) {
      const sidebars = [...document.querySelectorAll('aside')];
      const compact = sidebars.some((el) => el.className.includes('w-16') && el.className.includes('md:flex'));
      if (!compact) found.push('compact sidebar missing on tablet');
    }
    const tables = [...document.querySelectorAll('table')];
    for (const table of tables) {
      const wrapper = table.closest('.overflow-x-auto, [class*="overflow-x-auto"]');
      if (table.scrollWidth > table.clientWidth + 2 && !wrapper) {
        found.push('table overflows without scroll container');
      }
    }
    return found;
  }, { viewportWidth: width });
  if (issues.length) {
    throw new Error(`${file}: ${issues.join('; ')}`);
  }
}

async function captureShot(page, token, { file, width, height, route }) {
  await page.setViewportSize({ width, height });
  await page.goto(`${DASHBOARD_URL}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await assertDashboardLayout(page, { file, width });
  await page.screenshot({ path: path.join(OUTPUT_DIR, file), fullPage: true });
  console.log('saved', file);
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

  for (const shot of SHOTS) {
    await captureShot(page, token, shot);
  }

  await browser.close();
  console.log(`Dashboard responsive capture: ${SHOTS.length}/${SHOTS.length} passed`);
})();
