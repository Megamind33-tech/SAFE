/**
 * QA screenshots for Trusted Contacts screen.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const TRUSTED_CONTACTS_CACHE_KEY = 'safe_trusted_contacts_cache';
const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';

const EMPTY_QA_PHONE = '+260977000088';
const EMPTY_QA_PASSWORD = 'qa-empty-tc-88';
const SAVED_QA_PHONE = '+260977123456';
const SAVED_QA_PASSWORD = 'testpass123';

async function enableHardRefresh(context) {
  await context.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.close();
}

async function capturePhone(page, filename) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  const profileActive = page.locator('.bottom-nav .nav-item.active', { hasText: 'Profile' });
  if ((await profileActive.count()) === 0) {
    throw new Error('Profile tab must be active');
  }
  await page.locator('.phone-frame').screenshot({ path: path.join(OUTPUT_DIR, filename) });
}

async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
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

async function ensureQaUser(phone, password, fullName) {
  try {
    await apiRequest('/api/shared/auth/register', {
      method: 'POST',
      body: { phone, password, fullName },
    });
  } catch (err) {
    if (!/already exists|exists/i.test(String(err.message))) throw err;
  }
}

async function apiLogin(phone, password) {
  const data = await apiRequest('/api/shared/auth/login', {
    method: 'POST',
    body: { identifier: phone, password },
  });
  return data.token;
}

async function apiDeleteAllContacts(token) {
  const data = await apiRequest('/api/mobile/trusted-contacts', { token });
  for (const c of data.trustedContacts ?? []) {
    await apiRequest(`/api/mobile/trusted-contacts/${c.id}`, { method: 'DELETE', token });
  }
}

async function apiEnsureSarahContact(token) {
  let data = await apiRequest('/api/mobile/trusted-contacts', { token });
  let contacts = data.trustedContacts ?? [];
  if (!contacts.find((c) => c.name?.includes('Sarah'))) {
    await apiRequest('/api/mobile/trusted-contacts', {
      method: 'POST',
      token,
      body: {
        name: 'Sarah Mwansa',
        relationship: 'Sibling',
        phoneNumber: '+260977654567',
        isPrimary: true,
      },
    });
    data = await apiRequest('/api/mobile/trusted-contacts', { token });
    contacts = data.trustedContacts ?? [];
  }
  if (!contacts.find((c) => c.name?.includes('John'))) {
    await apiRequest('/api/mobile/trusted-contacts', {
      method: 'POST',
      token,
      body: {
        name: 'John Banda',
        relationship: 'Friend',
        phoneNumber: '+260976111222',
        isPrimary: false,
      },
    });
    data = await apiRequest('/api/mobile/trusted-contacts', { token });
    contacts = data.trustedContacts ?? [];
  }
  return contacts;
}

function mapApiToCache(contact) {
  return {
    id: contact.id,
    name: contact.name,
    relationship: contact.relationship,
    maskedPhone: contact.maskedPhone,
    isPrimary: Boolean(contact.isPrimary),
    isVerified: Boolean(contact.isVerified),
  };
}

async function gotoFresh(page) {
  const bust = `tc_qa=${Date.now()}`;
  await page.goto(`${BASE_URL}/?${bust}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE_URL}/?${bust}&r=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
}

async function loginInBrowser(page, phone, password) {
  await gotoFresh(page);
  await page.getByRole('button', { name: /^log in$/i }).click();
  await page.waitForSelector('input[placeholder="+260 or email address"]', { timeout: 15000 });
  await page.fill('input[placeholder="+260 or email address"]', phone);
  await page.fill('input[placeholder="Enter password"]', password);
  await page.locator('form.auth-form button[type="submit"]').click();
  await page.waitForSelector('.home-screen', { timeout: 30000 });
  await page.waitForTimeout(2000);
}

async function openTrustedContacts(page) {
  await page.locator('.bottom-nav').getByRole('button', { name: 'Profile', exact: true }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /trusted contacts/i }).click();
  await page.waitForSelector('.trusted-contacts-screen-board', { timeout: 15000 });
  await page.waitForTimeout(900);
}

async function assertNoFullPhone(page) {
  const text = await page.locator('.trusted-contacts-screen-board').innerText();
  if (/\+260977\d{6}/.test(text.replace(/\s/g, ''))) {
    throw new Error('Full unmasked phone number visible on screen');
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  await ensureQaUser(EMPTY_QA_PHONE, EMPTY_QA_PASSWORD, 'QA Empty Trusted Contacts');
  await ensureQaUser(SAVED_QA_PHONE, SAVED_QA_PASSWORD, 'QA Trusted Contacts');

  const emptyToken = await apiLogin(EMPTY_QA_PHONE, EMPTY_QA_PASSWORD);
  await apiDeleteAllContacts(emptyToken);

  const savedToken = await apiLogin(SAVED_QA_PHONE, SAVED_QA_PASSWORD);
  await apiDeleteAllContacts(savedToken);
  const apiContacts = await apiEnsureSarahContact(savedToken);
  const cachedSeed = apiContacts.map(mapApiToCache);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await enableHardRefresh(context);

  // 1. Empty
  {
    const page = await context.newPage();
    await loginInBrowser(page, EMPTY_QA_PHONE, EMPTY_QA_PASSWORD);
    await page.evaluate((key) => sessionStorage.removeItem(key), TRUSTED_CONTACTS_CACHE_KEY);
    await openTrustedContacts(page);
    await page.waitForSelector('.trusted-contacts-empty', { timeout: 20000 });
    await capturePhone(page, 'trusted-contacts-empty.png');
    await page.close();
  }

  // 2–6. Saved user flows
  {
    const page = await context.newPage();
    await loginInBrowser(page, SAVED_QA_PHONE, SAVED_QA_PASSWORD);
    await openTrustedContacts(page);
    await page.waitForSelector('.trusted-contact-card', { timeout: 20000 });
    await assertNoFullPhone(page);
    const title = await page.locator('.trusted-contacts-sheet__title').count();
    if (title > 0) {
      /* sheet not open */
    }
    await capturePhone(page, 'trusted-contacts-list.png');

    await page.getByRole('button', { name: 'Add trusted contact' }).first().click();
    await page.waitForSelector('.trusted-contacts-sheet');
    const sheetTitle = await page.locator('.trusted-contacts-sheet__title').textContent();
    if (!sheetTitle?.includes('Add trusted contact')) {
      throw new Error(`Add sheet title wrong: "${sheetTitle}"`);
    }
    await capturePhone(page, 'trusted-contacts-add-sheet.png');

    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(400);
    await page.locator('.trusted-contact-card', { hasText: 'John Banda' }).click();
    await page.waitForSelector('.trusted-contacts-sheet__title', { hasText: 'Edit trusted contact' });
    await capturePhone(page, 'trusted-contacts-edit-sheet.png');

    await page.fill('#tc-phone', '+260977654567');
    await page.waitForSelector('.trusted-contacts-sheet__field-notice', {
      timeout: 10000,
      hasText: 'already saved',
    });
    await capturePhone(page, 'trusted-contacts-duplicate-phone.png');

    await page.getByRole('button', { name: 'Remove contact' }).click();
    await page.waitForSelector('.trusted-contacts-sheet__title', { hasText: 'Remove trusted contact?' });
    await capturePhone(page, 'trusted-contacts-delete-confirm.png');
    await page.close();
  }

  await context.close();
  await browser.close();

  // Error no cache
  {
    const browser2 = await chromium.launch({ headless: true });
    const context2 = await browser2.newContext();
    await enableHardRefresh(context2);
    const page = await context2.newPage();
    await page.route('**/api/mobile/trusted-contacts**', (route) => route.abort('failed'));
    await loginInBrowser(page, EMPTY_QA_PHONE, EMPTY_QA_PASSWORD);
    await page.evaluate((key) => sessionStorage.removeItem(key), TRUSTED_CONTACTS_CACHE_KEY);
    await openTrustedContacts(page);
    await page.waitForSelector('.trusted-contacts-error', { timeout: 20000 });
    await capturePhone(page, 'trusted-contacts-error-no-cache.png');
    await context2.close();
    await browser2.close();
  }

  // Sync warning
  {
    const browser3 = await chromium.launch({ headless: true });
    const context3 = await browser3.newContext();
    await enableHardRefresh(context3);
    const page = await context3.newPage();
    await page.route('**/api/mobile/trusted-contacts**', (route) => route.abort('failed'));
    await loginInBrowser(page, SAVED_QA_PHONE, SAVED_QA_PASSWORD);
    await page.evaluate(
      ({ key, payload }) => sessionStorage.setItem(key, JSON.stringify(payload)),
      { key: TRUSTED_CONTACTS_CACHE_KEY, payload: cachedSeed }
    );
    await openTrustedContacts(page);
    await page.waitForSelector('.trusted-contact-card', { timeout: 15000 });
    await page.waitForSelector('.trusted-contacts-sync-warning', { timeout: 15000 });
    if ((await page.locator('.trusted-contacts-error').count()) > 0) {
      throw new Error('Full error shown with cached contacts');
    }
    await capturePhone(page, 'trusted-contacts-sync-warning.png');
    await context3.close();
    await browser3.close();
  }

  console.log('Saved screenshots to', OUTPUT_DIR);
  [
    'trusted-contacts-empty.png',
    'trusted-contacts-list.png',
    'trusted-contacts-add-sheet.png',
    'trusted-contacts-edit-sheet.png',
    'trusted-contacts-duplicate-phone.png',
    'trusted-contacts-error-no-cache.png',
    'trusted-contacts-sync-warning.png',
    'trusted-contacts-delete-confirm.png',
  ].forEach((f) => console.log('  -', f));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
