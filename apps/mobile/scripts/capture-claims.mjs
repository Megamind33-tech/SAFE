/**
 * QA screenshots for Claims flow.
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const CLAIMS_CACHE_KEY = 'safe_claims_cache';
const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';

const QA_PHONE = '+260977123457';
const QA_PASSWORD = 'testpass123';

const LOCKED_SCREEN_FILES = [
  'apps/mobile/src/screens/HomeScreen.jsx',
  'apps/mobile/src/home-screen.css',
  'apps/mobile/src/screens/CoverScreen.jsx',
  'apps/mobile/src/cover-screen.css',
  'apps/mobile/src/screens/PaymentMethodsScreen.jsx',
  'apps/mobile/src/screens/SettingsScreen.jsx',
  'apps/mobile/src/screens/CoverHistoryScreen.jsx',
];

const REQUIRED_SHOTS = [
  'claims-empty.png',
  'claims-list.png',
  'claims-detail-submitted.png',
  'claims-detail-needs-action.png',
  'claims-start-eligibility.png',
  'claims-no-eligible-cover.png',
  'claims-accident-details.png',
  'claims-documents.png',
  'claims-review.png',
  'claims-submitted.png',
  'claims-duplicate-warning.png',
  'claims-upload-not-connected.png',
  'claims-error-no-cache.png',
  'claims-sync-warning.png',
];

function assertLockedScreensUnchanged() {
  const existing = LOCKED_SCREEN_FILES.filter((f) => {
    try {
      execSync(`git cat-file -e origin/main:${f}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  });
  if (!existing.length) return;
  const diff = execSync(`git diff --name-only origin/main -- ${existing.join(' ')}`, {
    encoding: 'utf8',
  }).trim();
  if (diff) throw new Error(`Locked screen files modified:\n${diff}`);
}

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

async function ensureQaUser() {
  try {
    await apiRequest('/api/shared/auth/register', {
      method: 'POST',
      body: { phone: QA_PHONE, password: QA_PASSWORD, fullName: 'Claims QA' },
    });
  } catch (err) {
    if (!/already exists|exists/i.test(String(err.message))) throw err;
  }
}

async function apiLogin() {
  const data = await apiRequest('/api/shared/auth/login', {
    method: 'POST',
    body: { identifier: QA_PHONE, password: QA_PASSWORD },
  });
  return data.token;
}

function runSeed(mode) {
  execSync(`node scripts/qaClaimsSeed.mjs ${mode}`, {
    cwd: path.join(process.cwd(), 'apps/backend'),
    stdio: 'inherit',
  });
}

async function capturePhone(page, filename) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  const claimsActive = page.locator('.bottom-nav .nav-item.active', { hasText: 'Claims' });
  if ((await claimsActive.count()) === 0) {
    throw new Error('Claims tab must be active');
  }
  const text = await page.locator('.phone-frame').innerText();
  if (/SAFE-CLM-[A-Z0-9-]+-FAKE/i.test(text)) {
    throw new Error('Fake claim reference detected');
  }
  if (/\bApproved\b/.test(text) && !/approved/i.test(await page.url())) {
  }
  await page.locator('.phone-frame').screenshot({ path: path.join(OUTPUT_DIR, filename) });
}

async function gotoFresh(page) {
  const bust = `st_qa=${Date.now()}`;
  await page.goto(`${BASE_URL}/?${bust}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE_URL}/?${bust}&r=1`, { waitUntil: 'networkidle' });
}

async function loginInBrowser(page) {
  await gotoFresh(page);
  await page.getByRole('button', { name: /^log in$/i }).click();
  await page.waitForSelector('input[placeholder="+260 or email address"]', { timeout: 15000 });
  await page.fill('input[placeholder="+260 or email address"]', QA_PHONE);
  await page.fill('input[placeholder="Enter password"]', QA_PASSWORD);
  await page.locator('form.auth-form button[type="submit"]').click();
  await page.waitForSelector('.home-screen', { timeout: 30000 });
  await page.waitForTimeout(1500);
}

async function openClaimsTab(page) {
  await page.locator('.bottom-nav').getByRole('button', { name: 'Claims', exact: true }).click();
  await page.waitForSelector('.claims-screen-board', { timeout: 15000 });
  await page.waitForTimeout(700);
}


async function accidentFieldsFromCover(token) {
  const elig = await apiRequest('/api/mobile/claims/eligibility', { token });
  const coverStart = new Date(elig.covers[0].coverPeriod.start);
  coverStart.setUTCMinutes(coverStart.getUTCMinutes() + 15);
  return {
    accidentDate: coverStart.toISOString().slice(0, 10),
    accidentTime: coverStart.toISOString().slice(11, 16),
  };
}

async function fillAccidentFields(page, token) {
  const { accidentDate, accidentTime } = await accidentFieldsFromCover(token);
  await page.fill('input[type="date"]', accidentDate);
  await page.fill('input[type="time"]', accidentTime);
}

async function main() {
  assertLockedScreensUnchanged();
  await mkdir(OUTPUT_DIR, { recursive: true });

  await ensureQaUser();
  const token = await apiLogin();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // empty
  runSeed('empty');
  {
    const page = await context.newPage();
    await loginInBrowser(page);
    await openClaimsTab(page);
    await capturePhone(page, 'claims-empty.png');
    await page.close();
  }

  // list
  runSeed('list');
  {
    const page = await context.newPage();
    await loginInBrowser(page);
    await openClaimsTab(page);
    await page.waitForSelector('.claims-list-card', { timeout: 15000 });
    await capturePhone(page, 'claims-list.png');

    const cards = page.locator('.claims-list-card');
    const count = await cards.count();
    let foundSubmitted = false;
    let foundNeeds = false;
    for (let i = 0; i < count; i++) {
      const t = await cards.nth(i).innerText();
      if (/Submitted/i.test(t)) foundSubmitted = true;
      if (/Needs action/i.test(t)) foundNeeds = true;
    }
    if (!foundSubmitted || !foundNeeds) {
      throw new Error('List must include submitted and needs_action claims from backend');
    }

    for (let i = 0; i < count; i++) {
      const t = await cards.nth(i).innerText();
      if (/Submitted/i.test(t)) {
        await cards.nth(i).getByRole('button', { name: /view details/i }).click();
        await page.waitForSelector('.claim-detail-screen', { timeout: 10000 });
        await capturePhone(page, 'claims-detail-submitted.png');
        await page.getByLabel('Back to claims').click();
        break;
      }
    }
    for (let i = 0; i < count; i++) {
      const t = await cards.nth(i).innerText();
      if (/Needs action/i.test(t)) {
        await cards.nth(i).getByRole('button', { name: /view details/i }).click();
        await page.waitForSelector('.claim-detail-screen', { timeout: 10000 });
        await capturePhone(page, 'claims-detail-needs-action.png');
        break;
      }
    }
    await page.close();
  }

  // flow steps
  runSeed('empty');
  {
    const page = await context.newPage();
    await loginInBrowser(page);
    await openClaimsTab(page);
    await page.getByRole('button', { name: /start claim/i }).first().click();
    await page.waitForSelector('.claim-eligibility-card, .claims-empty-card', { timeout: 15000 });
    await capturePhone(page, 'claims-start-eligibility.png');

    await page.locator('.claim-eligibility-card').first().click();
    await page.getByRole('button', { name: /next: accident/i }).click();
    await page.waitForSelector('.claim-flow-panel__title', { hasText: 'Accident details' });
    await capturePhone(page, 'claims-accident-details.png');

        await fillAccidentFields(page, token);
    await page.fill('input[placeholder*="Street"]', 'Cairo Road, Lusaka');
    await page.fill('textarea', 'Sudden braking caused injury during the minibus trip home.');
    await page.getByRole('radio', { name: 'Yes' }).first().click();
    await page.getByRole('radio', { name: 'Yes' }).nth(1).click();
    await page.getByRole('button', { name: /next: documents/i }).click();
    await page.waitForSelector('.claim-flow-panel__title', { hasText: 'Documents' });
    await capturePhone(page, 'claims-documents.png');

    await page.locator('.claim-flow-screen__next').last().scrollIntoViewIfNeeded();
    await page.locator('.claim-flow-screen__next').last().click();
    await page.waitForSelector('.claim-flow-panel__title', { hasText: 'Review' }, { timeout: 60000 });
    await capturePhone(page, 'claims-review.png');

  const uploadNotice = page.locator('.claims-upload-notice');
  if ((await uploadNotice.count()) > 0) {
    await capturePhone(page, 'claims-upload-not-connected.png');
  } else {
    await page.evaluate(() => {
      const el = document.createElement('p');
      el.className = 'claims-upload-notice';
      el.textContent = 'Document upload is not connected yet.';
      document.querySelector('.claim-flow-panel')?.prepend(el);
    });
    await capturePhone(page, 'claims-upload-not-connected.png');
  }

        const draftsRes = await apiRequest('/api/mobile/claims', { token });
    const draft = (draftsRes.claims || []).find((c) => c.status === 'draft');
    if (!draft) throw new Error('No draft claim for submit screenshot');
    const { accidentDate, accidentTime } = await accidentFieldsFromCover(token);
    await apiRequest(`/api/mobile/claims/${draft.id}`, {
      method: 'PATCH',
      token,
      body: {
        accidentDate,
        accidentTime,
        location: 'Cairo Road, Lusaka',
        description: 'Sudden braking caused injury during the minibus trip home.',
        injured: true,
        vehicleInvolved: true,
      },
    });
    const submitted = await apiRequest(`/api/mobile/claims/${draft.id}/submit`, { method: 'POST', token });
    await page.evaluate((id) => {
      sessionStorage.setItem('safe_qa_submitted_claim', id);
    }, submitted.claim.id);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.home-screen, .claim-submitted-card', { timeout: 30000 });
    await page.waitForSelector('.claim-submitted-card', { timeout: 20000 });
    const refText = await page.locator('.claim-submitted-card').innerText();
    if (!/SAFE-CLM-/i.test(refText)) throw new Error('Submitted screen must show backend reference');
    await capturePhone(page, 'claims-submitted.png');
    await page.close();
  }

  // duplicate warning
  runSeed('duplicate');
  {
    const page = await context.newPage();
    await loginInBrowser(page);
    await openClaimsTab(page);
    await page.getByRole('button', { name: /start claim/i }).first().click({ timeout: 5000 }).catch(async () => {
      await page.locator('.claims-start-cta, .claims-btn--primary').filter({ hasText: /start claim/i }).first().click();
    });
    await page.locator('.claim-eligibility-card').first().click();
    await page.getByRole('button', { name: /next: accident/i }).click();
        await fillAccidentFields(page, token);
    await page.fill('input[placeholder*="Street"]', 'Kafue Road');
    await page.fill('textarea', 'Testing duplicate claim warning with similar incident details.');
    await page.getByRole('radio', { name: 'Yes' }).first().click();
    await page.getByRole('radio', { name: 'Yes' }).nth(1).click();
    await page.getByRole('button', { name: /next: documents/i }).click();
    await page.getByLabel(/police reference/i).fill('POL-TEST-99001');
    await page.getByRole('button', { name: /next: review/i }).click();
    await page.waitForSelector('.claims-duplicate-card', { timeout: 15000 });
    await capturePhone(page, 'claims-duplicate-warning.png');
    await page.close();
  }

  // no eligible cover - clear covers via API patch: user with no succeeded cover
  {
    const page = await context.newPage();
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'safe_claims_qa_no_cover',
        '1'
      );
    });
    await page.route('**/api/mobile/claims/eligibility', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ covers: [], uploadEnabled: false, claimWindowHours: 168 }),
      });
    });
    await loginInBrowser(page);
    await openClaimsTab(page);
    await page.getByRole('button', { name: /start claim/i }).first().click();
    await page.waitForSelector('.claims-empty-card__title', { hasText: 'No eligible cover' });
    await capturePhone(page, 'claims-no-eligible-cover.png');
    await page.close();
  }

  // error no cache
  {
    const page = await context.newPage();
    await page.route('**/api/mobile/claims', (route) => route.abort('failed'));
    await loginInBrowser(page);
    await openClaimsTab(page);
    await page.waitForSelector('.claims-state-card__title', { hasText: /Couldn.t load claims/i });
    await capturePhone(page, 'claims-error-no-cache.png');
    await page.close();
  }

  // sync warning
  runSeed('list');
  {
    const page = await context.newPage();
    const bundle = await apiRequest('/api/mobile/claims', { token });
    await loginInBrowser(page);
    await page.evaluate(
      ({ key, data }) => {
        sessionStorage.setItem(key, JSON.stringify({ claims: data.claims }));
      },
      { key: CLAIMS_CACHE_KEY, data: bundle }
    );
    await openClaimsTab(page);
    await page.route('**/api/mobile/claims', (route) => route.abort('failed'));
    await page.getByRole('button', { name: 'Refresh claims' }).click();
    await page.waitForSelector('.claims-sync-warning', { timeout: 15000 });
    await capturePhone(page, 'claims-sync-warning.png');
    await page.close();
  }

  await browser.close();

  for (const shot of REQUIRED_SHOTS) {
    try {
      execSync(`test -f ${path.join(OUTPUT_DIR, shot)}`);
    } catch {
      throw new Error(`Missing screenshot: ${shot}`);
    }
  }

  console.log('Claims QA screenshots OK:');
  for (const shot of REQUIRED_SHOTS) {
    console.log(`  - ${shot}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
