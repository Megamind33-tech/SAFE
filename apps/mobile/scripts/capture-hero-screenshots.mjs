import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';
const PHONE = '+260977123456';
const PASSWORD = 'testpass123';

async function clickThroughToLogin(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  const loginButton = page.getByRole('button', { name: /log in/i });
  if (await loginButton.isVisible({ timeout: 4000 }).catch(() => false)) {
    await loginButton.click();
    return;
  }
  for (let i = 0; i < 6; i += 1) {
    if (await loginButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await loginButton.click();
      return;
    }
    for (const pattern of [/next/i, /continue/i, /skip/i, /get started/i]) {
      const btn = page.getByRole('button', { name: pattern }).first();
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(500);
        break;
      }
    }
  }
}

async function login(page) {
  await clickThroughToLogin(page);
  await page.waitForSelector('input[placeholder="+260 or email address"]', { timeout: 15000 });
  await page.fill('input[placeholder="+260 or email address"]', PHONE);
  await page.fill('input[placeholder="Enter password"]', PASSWORD);
  await page.getByRole('button', { name: /^log in$/i }).click();
  await page.waitForSelector('.safe-hero-wrapper', { timeout: 20000 });
}

async function capture(page, selector, width, filename) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(700);
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  await target.screenshot({ path: path.join(OUTPUT_DIR, filename) });
}

async function capturePhone(page, width, filename) {
  await page.setViewportSize({ width, height: 844 });
  await page.waitForTimeout(700);
  await page.locator('.phone-frame').screenshot({ path: path.join(OUTPUT_DIR, filename) });
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });

  try {
    await login(page);
    await capturePhone(page, 390, 'home-layout-fixed-390px.png');
    await capture(page, '.safe-hero-wrapper', 390, 'hero-active-cover-390px.png');
    await capture(page, '.safe-hero-wrapper', 430, 'hero-active-cover-430px.png');

    const title = await page.locator('.safe-hero-title').first().textContent();
    const status = await page.locator('.safe-hero-status').first().textContent();

    console.log(JSON.stringify({
      ok: true,
      title: title?.trim(),
      status: status?.trim(),
      screenshots: [
        'home-logged-in-active-cover-390px.png',
        'hero-active-cover-390px.png',
        'hero-active-cover-430px.png',
      ].map((f) => path.join(OUTPUT_DIR, f)),
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error) }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
