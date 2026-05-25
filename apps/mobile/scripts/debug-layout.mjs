import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'http://127.0.0.1:5173';
const OUT = '/opt/cursor/artifacts/screenshots';
const PHONE = '+260977123456';
const PASS = 'testpass123';

async function login(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const loginBtn = page.getByRole('button', { name: /log in/i });
  for (let i = 0; i < 6; i++) {
    if (await loginBtn.isVisible({ timeout: 1000 }).catch(() => false)) break;
    for (const p of [/next/i, /continue/i, /skip/i, /get started/i]) {
      const b = page.getByRole('button', { name: p }).first();
      if (await b.isVisible({ timeout: 500 }).catch(() => false)) { await b.click(); break; }
    }
  }
  if (await loginBtn.isVisible({ timeout: 2000 }).catch(() => false)) await loginBtn.click();
  await page.fill('input[placeholder="+260 or email address"]', PHONE);
  await page.fill('input[placeholder="Enter password"]', PASS);
  await page.getByRole('button', { name: /^log in$/i }).click();
  await page.waitForSelector('.safe-hero-wrapper, .active-cover-card', { timeout: 20000 });
}

async function shot(page, name) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.locator('.phone-frame').screenshot({ path: path.join(OUT, name) });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await login(page);
  await shot(page, 'debug-home-full.png');
  await page.getByRole('button', { name: /cover/i }).click();
  await page.waitForTimeout(800);
  await shot(page, 'debug-cover-full.png');
  await browser.close();
  console.log('done');
}
main();
