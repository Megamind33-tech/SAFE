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

async function clickThroughToLogin(page) {
  await gotoFresh(page);
  const loginButton = page.getByRole('button', { name: /^log in$/i });
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

async function captureAuthenticatedScreens(page, shots) {
  await loginDirect(page);
  await capturePhone(page, '07-home-active-cover.png');
  shots.push('07-home-active-cover.png');

  await navTo(page, 'Cover');
  await capturePhone(page, '08-cover-active.png');
  shots.push('08-cover-active.png');

  await navTo(page, 'Claims');
  await capturePhone(page, '09-claims.png');
  shots.push('09-claims.png');

  await navTo(page, 'Profile');
  await capturePhone(page, '10-profile.png');
  shots.push('10-profile.png');

  await page.locator('.settings-list').getByRole('button', { name: /payment methods/i }).click();
  await page.waitForTimeout(700);
  await capturePhone(page, '11-profile-payment-methods.png');
  shots.push('11-profile-payment-methods.png');

  await page.locator('.top-bar').getByRole('button').first().click();
  await page.waitForTimeout(500);
  await navTo(page, 'Profile');
  await page.locator('.settings-list').getByRole('button', { name: /^notifications$/i }).click();
  await page.waitForTimeout(700);
  await capturePhone(page, '12-notifications.png');
  shots.push('12-notifications.png');

  await page.locator('.top-bar').getByRole('button').first().click();
  await page.waitForTimeout(500);
  await navTo(page, 'Profile');
  await page.locator('.settings-list').getByRole('button', { name: /help and safety/i }).click();
  await page.waitForTimeout(700);
  await capturePhone(page, '13-help-safety.png');
  shots.push('13-help-safety.png');

  await page.getByRole('button', { name: /connection help/i }).click();
  await page.waitForTimeout(700);
  await capturePhone(page, '14-offline.png');
  shots.push('14-offline.png');

  await page.getByRole('button', { name: /go to my cover/i }).click();
  await page.waitForTimeout(700);
  await navTo(page, 'Home');

  await page.getByRole('button', { name: /scan qr/i }).first().click();
  await page.waitForTimeout(800);
  await capturePhone(page, '15-scanner-qr.png');
  shots.push('15-scanner-qr.png');

  await page.getByRole('button', { name: /SAFE-LSK-2481/i }).click();
  await page.waitForTimeout(900);
  await capturePhone(page, '16-choose-cover.png');
  shots.push('16-choose-cover.png');

  await page.getByRole('button', { name: /continue to payment/i }).click();
  await page.waitForTimeout(700);
  await capturePhone(page, '17-payment.png');
  shots.push('17-payment.png');

  await page.locator('.top-bar').getByRole('button').first().click();
  await page.waitForTimeout(500);
  await page.locator('.top-bar').getByRole('button').first().click();
  await page.waitForTimeout(500);

  await navTo(page, 'Cover');
  await page.getByRole('button', { name: /view policy/i }).first().click();
  await page.waitForTimeout(800);
  await capturePhone(page, '18-history.png');
  shots.push('18-history.png');

  await page.locator('.history-top').getByRole('button', { name: /back/i }).click();
  await page.waitForTimeout(500);
  await navTo(page, 'Home');
  await page.getByRole('button', { name: /share trip/i }).click();
  await page.waitForTimeout(800);
  await capturePhone(page, '19-chat-support.png');
  shots.push('19-chat-support.png');
}

async function navTo(page, label) {
  await page.locator('.bottom-nav').getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(900);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const shots = [];

  try {
    // Pre-auth flow
    await gotoFresh(page);
    await capturePhone(page, '01-splash.png');
    shots.push('01-splash.png');

    await page.getByRole('button', { name: /get started/i }).click();
    await page.waitForTimeout(600);
    await capturePhone(page, '02-onboarding-1.png');
    shots.push('02-onboarding-1.png');

    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(600);
    await capturePhone(page, '03-onboarding-2.png');
    shots.push('03-onboarding-2.png');

    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(600);
    await capturePhone(page, '04-onboarding-3.png');
    shots.push('04-onboarding-3.png');

    await page.getByRole('button', { name: /next|continue/i }).click();
    await page.waitForTimeout(600);
    await capturePhone(page, '05-signup.png');
    shots.push('05-signup.png');

    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForTimeout(600);
    await capturePhone(page, '06-login.png');
    shots.push('06-login.png');

    // Authenticated screens (fresh login session)
    await captureAuthenticatedScreens(page, shots);

    console.log(JSON.stringify({
      ok: true,
      outputDir: OUTPUT_DIR,
      screenshots: shots.map((f) => path.join(OUTPUT_DIR, f)),
    }, null, 2));
  } catch (error) {
    await capturePhone(page, 'error-state.png').catch(() => {});
    console.error(JSON.stringify({ ok: false, error: String(error), stack: error.stack }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
