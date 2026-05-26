/**
 * QA screenshots for Claims flow.
 * Requires mobile dev server with VITE_CLAIMS_QA_CAPTURE=true (see package script claims:capture).
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { readFileSync as readSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const CLAIMS_CACHE_KEY = 'safe_claims_cache';
const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';
const QA_CAPTURE_ENABLED = process.env.VITE_CLAIMS_QA_CAPTURE === 'true';

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

const QA_SOURCE_FILES = [
  'apps/mobile/src/App.jsx',
  'apps/mobile/src/screens/ClaimFlowScreen.jsx',
  'apps/mobile/src/utils/claimsQa.js',
];

const FORBIDDEN_UI_PHRASES = [
  /fraud detected/i,
  /guaranteed approval/i,
  /instant payout/i,
  /SAFE-CLM-[A-Z0-9-]+-FAKE/i,
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

function assertQaCaptureEnv() {
  if (!QA_CAPTURE_ENABLED) {
    throw new Error(
      'capture-claims requires VITE_CLAIMS_QA_CAPTURE=true (npm run claims:capture from apps/mobile)'
    );
  }
}

function assertQaHooksGatedInSource() {
  for (const file of QA_SOURCE_FILES) {
    const src = readSync(path.join(REPO_ROOT, file), 'utf8');
    const rawQaStorage = /sessionStorage\.(get|set|remove)Item\(\s*['"]safe_qa_/g;
    if (rawQaStorage.test(src) && !src.includes('isClaimsQaCapture') && !file.endsWith('claimsQa.js')) {
      throw new Error(`${file} uses safe_qa_* sessionStorage without isClaimsQaCapture gating`);
    }
    if (file.endsWith('ClaimFlowScreen.jsx') && rawQaStorage.test(src)) {
      throw new Error(`${file} must not access safe_qa_* sessionStorage directly`);
    }
  }
}

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
    cwd: REPO_ROOT,
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
    cwd: path.join(REPO_ROOT, 'apps/backend'),
    stdio: 'inherit',
  });
}

function assertFrameCopy(text, { allowApproved = false, allowPaid = false } = {}) {
  for (const pattern of FORBIDDEN_UI_PHRASES) {
    if (pattern.test(text)) {
      throw new Error(`Forbidden UI copy: ${pattern}`);
    }
  }
  if (/\bDraft\b/i.test(text) && /Claim submitted/i.test(text)) {
    throw new Error('Draft must not appear on submitted screen');
  }
  if (/\bApproved\b/i.test(text) && !allowApproved) {
    throw new Error('Approved status must not appear without backend seed');
  }
  if (/\bPaid\b/i.test(text) && !allowPaid) {
    throw new Error('Paid status must not appear without backend seed');
  }
}

async function assertBottomNavNoOverlap(page) {
  const overlap = await page.evaluate(() => {
    const nav = document.querySelector('.bottom-nav');
    if (!nav) return false;
    const navTop = nav.getBoundingClientRect().top;
    const targets = [
      ...document.querySelectorAll(
        '.claims-btn--primary, .claims-start-cta, .claim-flow-screen__next, .claim-submitted-card button'
      ),
    ];
    if (!targets.length) return false;
    const last = targets[targets.length - 1];
    const rect = last.getBoundingClientRect();
    return rect.bottom > navTop - 4 && rect.top < navTop;
  });
  if (overlap) throw new Error('Primary actions overlap bottom nav');
}

async function capturePhone(page, filename, opts = {}) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  const claimsActive = page.locator('.bottom-nav .nav-item.active', { hasText: 'Claims' });
  if ((await claimsActive.count()) === 0) {
    throw new Error('Claims tab must be active');
  }
  const text = await page.locator('.phone-frame').innerText();
  assertFrameCopy(text, opts);
  if (filename === 'claims-upload-not-connected.png') {
    if (!/Document upload is not connected yet/i.test(text)) {
      throw new Error('Upload-not-connected shot must show disconnected copy');
    }
    if (/\bUploaded\b/i.test(text)) {
      throw new Error('Upload-not-connected must not show Uploaded success');
    }
  }
  await assertBottomNavNoOverlap(page);
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
  if (!elig.covers?.length) throw new Error('Expected eligible cover for flow capture');
  for (const cover of elig.covers) {
    if (cover.paymentStatus && cover.paymentStatus !== 'succeeded') {
      throw new Error('Pending or failed payment cover must not be eligible');
    }
  }
  const coverStart = new Date(elig.covers[0].coverPeriod.start);
  coverStart.setUTCMinutes(coverStart.getUTCMinutes() + 15);
  return {
    accidentDate: coverStart.toISOString().slice(0, 10),
    accidentTime: coverStart.toISOString().slice(11, 16),
    uploadEnabled: Boolean(elig.uploadEnabled),
  };
}

async function fillAccidentFields(page, token) {
  const { accidentDate, accidentTime } = await accidentFieldsFromCover(token);
  await page.fill('input[type="date"]', accidentDate);
  await page.fill('input[type="time"]', accidentTime);
  return { accidentDate, accidentTime };
}

async function assertSubmitValidation(token) {
  const elig = await apiRequest('/api/mobile/claims/eligibility', { token });
  const coverId = elig.covers[0]?.coverId;
  if (!coverId) return;
  const draft = await apiRequest('/api/mobile/claims', {
    method: 'POST',
    token,
    body: { tripCoverId: coverId },
  });
  const future = new Date();
  future.setFullYear(future.getFullYear() + 1);
  try {
    await apiRequest(`/api/mobile/claims/${draft.claim.id}`, {
      method: 'PATCH',
      token,
      body: {
        accidentDate: future.toISOString().slice(0, 10),
        accidentTime: '12:00',
        location: 'Test',
        description: 'Future dated incident should not submit successfully.',
        injured: true,
        vehicleInvolved: true,
      },
    });
    await apiRequest(`/api/mobile/claims/${draft.claim.id}/submit`, { method: 'POST', token });
    throw new Error('Future accident date must not submit');
  } catch (err) {
    if (/Future accident date must not submit/.test(String(err.message))) throw err;
  }
  try {
    await apiRequest(`/api/mobile/claims/${draft.claim.id}/submit`, { method: 'POST', token });
    throw new Error('Empty required fields must not submit');
  } catch {
    // expected
  }
}

async function main() {
  assertQaCaptureEnv();
  assertQaHooksGatedInSource();
  assertLockedScreensUnchanged();
  await mkdir(OUTPUT_DIR, { recursive: true });

  await ensureQaUser();
  const token = await apiLogin();
  await assertSubmitValidation(token);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  runSeed('empty');
  {
    const page = await context.newPage();
    await loginInBrowser(page);
    await openClaimsTab(page);
    await capturePhone(page, 'claims-empty.png');
    await page.close();
  }

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

    const { accidentDate, accidentTime, uploadEnabled } = await accidentFieldsFromCover(token);
    await page.fill('input[type="date"]', accidentDate);
    await page.fill('input[type="time"]', accidentTime);
    await page.fill('input[placeholder*="Street"]', 'Cairo Road, Lusaka');
    await page.fill('textarea', 'Sudden braking caused injury during the minibus trip home.');
    await page.getByRole('radio', { name: 'Yes' }).first().click();
    await page.getByRole('radio', { name: 'Yes' }).nth(1).click();
    await page.getByRole('button', { name: /next: documents/i }).click();
    await page.waitForSelector('.claim-flow-panel__title', { hasText: 'Documents' });
    if (!uploadEnabled) {
      await capturePhone(page, 'claims-upload-not-connected.png');
    }
    await capturePhone(page, 'claims-documents.png');

    const policeRef = `POL-QA-${Date.now()}`;
    await page.getByLabel(/police reference/i).fill(policeRef);
    await page.locator('.claim-flow-screen__next').last().scrollIntoViewIfNeeded();
    await page.locator('.claim-flow-screen__next').last().click();
    await page.waitForSelector('.claim-flow-panel__title', { hasText: 'Review' }, { timeout: 60000 });
    await capturePhone(page, 'claims-review.png');

    const submitPromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/mobile/claims/') &&
        res.url().includes('/submit') &&
        res.request().method() === 'POST',
      { timeout: 90000 }
    );
    await page.getByRole('button', { name: /submit claim/i }).click();
    const submitRes = await submitPromise;
    if (!submitRes.ok()) throw new Error(`Submit API failed (${submitRes.status()})`);
    const submitBody = await submitRes.json();
    if (!submitBody?.claim?.reference) {
      throw new Error('Submit API must return backend claim reference');
    }
    await page.waitForSelector('.claim-submitted-card', { timeout: 20000 });
    const refText = await page.locator('.claim-submitted-card').innerText();
    if (!refText.includes(submitBody.claim.reference)) {
      throw new Error('Submitted screen must show backend-generated reference only');
    }
    if (submitBody.claim.status === 'draft') {
      throw new Error('Submitted screen must not show draft status');
    }
    await capturePhone(page, 'claims-submitted.png');
    await page.close();
  }

  runSeed('duplicate');
  {
    const page = await context.newPage();
    await loginInBrowser(page);
    await openClaimsTab(page);
    await page.getByRole('button', { name: /start claim/i }).first().click();
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
    const dupText = await page.locator('.claims-duplicate-card').innerText();
    if (!/Possible duplicate claim/i.test(dupText)) {
      throw new Error('Duplicate warning card must use careful duplicate copy');
    }
    await capturePhone(page, 'claims-duplicate-warning.png');
    await page.close();
  }

  {
    const page = await context.newPage();
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

  {
    const page = await context.newPage();
    await page.route('**/api/mobile/claims', (route) => route.abort('failed'));
    await loginInBrowser(page);
    await openClaimsTab(page);
    await page.waitForSelector('.claims-state-card__title', { hasText: /Couldn.t load claims/i });
    const text = await page.locator('.phone-frame').innerText();
    if (/Your claims/i.test(text) && /claims-list-card/.test(await page.content())) {
      throw new Error('Full error must not appear while cached claims exist');
    }
    await capturePhone(page, 'claims-error-no-cache.png');
    await page.close();
  }

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
    const text = await page.locator('.phone-frame').innerText();
    if (/Couldn.t load claims/i.test(text) && !/last saved/i.test(text)) {
      throw new Error('Sync warning must keep cached claims visible');
    }
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
