import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.cwd(), '../../screenshots');

const SHOTS = [
  { file: 'onboarding-1-cover-your-trip.png', afterClicks: 1 },
  { file: 'onboarding-2-safety-first.png', afterClicks: 2 },
  { file: 'onboarding-3-share-track-stay-connected.png', afterClicks: 3 },
];

async function gotoOnboarding(page, step) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /get started/i }).click();
  for (let i = 1; i < step; i += 1) {
    await page.getByRole('button', { name: /next step/i }).click();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(600);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

  try {
    for (const { file, afterClicks } of SHOTS) {
      await gotoOnboarding(page, afterClicks);
      await page.locator('.phone-frame').screenshot({ path: path.join(OUTPUT_DIR, file) });
      console.log(`saved ${file}`);
    }
    console.log(JSON.stringify({ ok: true, outputDir: OUTPUT_DIR }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
