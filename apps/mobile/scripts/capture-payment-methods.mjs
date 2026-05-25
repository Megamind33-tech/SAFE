import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
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
  await page.waitForTimeout(700);
}

async function resolveUserStorageKey(page) {
  return page.evaluate(async (baseUrl) => {
    const token = localStorage.getItem('safe_token');
    if (!token) return 'anonymous';
    try {
      const res = await fetch(`${baseUrl}/api/shared/auth/me`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data?.user?.id || data?.user?.phone || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }, API_BASE);
}

async function seedPaymentMethods(page, userId) {
  await page.evaluate((id) => {
    const methods = [
      {
        id: 'pm_demo_airtel',
        type: 'mobile_money',
        provider: 'airtel',
        displayName: 'Airtel Money',
        maskedValue: '+260 ** *** 456',
        isDefault: true,
        status: 'active',
      },
      {
        id: 'pm_demo_mtn',
        type: 'mobile_money',
        provider: 'mtn',
        displayName: 'MTN Mobile Money',
        maskedValue: '+260 ** *** 789',
        isDefault: false,
        status: 'active',
      },
    ];
    localStorage.setItem(`safe_payment_methods_v1_${id}`, JSON.stringify(methods));
  }, userId);
}

async function clearPaymentMethods(page, userId) {
  await page.evaluate((id) => {
    localStorage.removeItem(`safe_payment_methods_v1_${id}`);
  }, userId);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await loginDirect(page);
  const userId = await resolveUserStorageKey(page);

  await seedPaymentMethods(page, userId);
  await openPaymentMethods(page);
  await capturePhone(page, 'payment-methods-normal.png');

  await page.getByRole('button', { name: 'Add payment method' }).first().click();
  await page.waitForTimeout(600);
  await capturePhone(page, 'payment-methods-add-sheet.png');

  await page.locator('.payment-methods-sheet__close').click();
  await page.waitForTimeout(500);

  await page.locator('.payment-methods-header__back').click();
  await page.waitForTimeout(500);
  await clearPaymentMethods(page, userId);
  await openPaymentMethods(page);
  await capturePhone(page, 'payment-methods-empty.png');

  await page.locator('.payment-methods-header__back').click();
  await page.waitForTimeout(500);

  await page.route('**/api/mobile/payment-methods**', (route) => route.abort('failed'));
  await openPaymentMethods(page);
  await page.waitForSelector('.payment-methods-error', { timeout: 15000 });
  await page.waitForTimeout(500);
  await capturePhone(page, 'payment-methods-error.png');

  await browser.close();
  console.log('Saved payment method screenshots to', OUTPUT_DIR);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
