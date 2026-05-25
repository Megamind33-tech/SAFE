import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';
const PHONE = '+260977123456';
const PASSWORD = 'testpass123';

async function capturePhone(page, filename) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  await page.locator('.phone-frame').screenshot({ path: path.join(OUTPUT_DIR, filename) });
}

async function gotoFresh(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
}

async function loginDirect(page) {
  await gotoFresh(page);
  await page.getByRole('button', { name: /^log in$/i }).click();
  await page.waitForSelector('input[placeholder="+260 or email address"]', { timeout: 15000 });
  await page.fill('input[placeholder="+260 or email address"]', PHONE);
  await page.fill('input[placeholder="Enter password"]', PASSWORD);
  await page.locator('form.auth-form button[type="submit"]').click();
  await page.waitForSelector('.home-screen', { timeout: 30000 });
  await page.waitForTimeout(2500);
}

async function navTo(page, label) {
  await page.locator('.bottom-nav').getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(900);
}

async function openPaymentMethods(page) {
  await navTo(page, 'Profile');
  await page.getByRole('button', { name: /payment methods/i }).click();
  await page.waitForSelector('.payment-methods-screen-board', { timeout: 15000 });
  await page.waitForTimeout(900);
}

async function closeSheetIfOpen(page) {
  const overlay = page.locator('.payment-methods-sheet-overlay');
  if (await overlay.count()) {
    await page.locator('.payment-methods-sheet__close').click();
    await page.waitForTimeout(400);
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await loginDirect(page);
  await openPaymentMethods(page);
  await page.waitForSelector('.payment-methods-empty, .payment-methods-list', { timeout: 15000 });
  await capturePhone(page, 'payment-methods-empty.png');

  await page.getByRole('button', { name: 'Add payment method' }).first().click();
  await page.waitForTimeout(700);
  await capturePhone(page, 'payment-methods-add-sheet.png');

  await page.locator('.payment-methods-sheet__close').click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: 'Add payment method' }).first().click();
  await page.getByRole('button', { name: /Airtel Money/i }).click();
  await page.fill('#mobile-money-phone', '+260977123456');
  await page.getByRole('button', { name: /Save method|Use saved method/ }).click();
  await page.waitForSelector('.payment-methods-list', { timeout: 15000 });
  await closeSheetIfOpen(page);
  await page.waitForTimeout(700);
  await capturePhone(page, 'payment-methods-airtel-default.png');

  await page.getByRole('button', { name: 'Add payment method' }).first().click();
  await page.waitForSelector('.payment-methods-sheet', { timeout: 5000 });
  await page.getByRole('button', { name: /Airtel Money/i }).click();
  await page.fill('#mobile-money-phone', '+260977123456');
  await page.getByRole('button', { name: 'Save method' }).click();
  await page.waitForSelector('.payment-methods-sheet__field-notice', { timeout: 10000 });
  await page.waitForTimeout(700);
  await capturePhone(page, 'payment-methods-duplicate-flow.png');

  await page.getByRole('button', { name: 'Use saved method' }).click();
  await page.waitForSelector('.payment-methods-list', { timeout: 15000 });
  await page.waitForTimeout(500);

  await browser.close();

  const errorBrowser = await chromium.launch({ headless: true });
  const errorPage = await errorBrowser.newPage();
  await errorPage.setViewportSize({ width: 390, height: 844 });
  await errorPage.goto(BASE_URL, { waitUntil: 'networkidle' });
  await errorPage.evaluate(() => localStorage.clear());
  await errorPage.route('**/api/mobile/payment-methods**', (route) => route.abort('failed'));
  await errorPage.goto(BASE_URL, { waitUntil: 'networkidle' });
  await errorPage.getByRole('button', { name: /^log in$/i }).click();
  await errorPage.fill('input[placeholder="+260 or email address"]', PHONE);
  await errorPage.fill('input[placeholder="Enter password"]', PASSWORD);
  await errorPage.locator('form.auth-form button[type="submit"]').click();
  await errorPage.waitForSelector('.home-screen', { timeout: 30000 });
  await errorPage.locator('.bottom-nav').getByRole('button', { name: 'Profile', exact: true }).click();
  await errorPage.getByRole('button', { name: /payment methods/i }).click();
  await errorPage.waitForSelector('.payment-methods-error', { timeout: 15000 });
  await errorPage.waitForTimeout(900);
  await errorPage.locator('.phone-frame').screenshot({
    path: path.join(OUTPUT_DIR, 'payment-methods-error.png'),
  });
  await errorBrowser.close();

  console.log('Saved payment method screenshots to', OUTPUT_DIR);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
