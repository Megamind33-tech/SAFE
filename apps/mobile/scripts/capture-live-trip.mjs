/**
 * QA screenshots for live trip / map states.
 * Run: npm run live-trip:capture (from apps/mobile)
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
// Minimal 1×1 transparent PNG — used to stub OSM tile responses so the sandbox
// network policy (which blocks tile CDN requests) does not collapse the Leaflet
// canvas into the tile-error fallback state during QA captures.
const STUB_TILE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
const BASE_URL = process.env.MOBILE_URL || 'http://127.0.0.1:5173';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/opt/cursor/artifacts/screenshots';
const QA_PHONE = '+260977123458';
const QA_PASSWORD = 'testpass123';
const CACHE_KEY = 'safe_active_trip_cache';

const LOCKED = [
  'apps/mobile/src/screens/HomeScreen.jsx',
  'apps/mobile/src/home-screen.css',
  'apps/mobile/src/screens/CoverScreen.jsx',
  'apps/mobile/src/cover-screen.css',
  'apps/mobile/src/screens/ClaimsScreen.jsx',
  'apps/mobile/src/screens/SettingsScreen.jsx',
];

const SHOTS = [
  'live-trip-active-route.png',
  'live-trip-active-no-route.png',
  'live-trip-no-active-trip.png',
  'live-trip-location-needed.png',
  'live-trip-location-denied.png',
  'live-trip-map-offline.png',
  'live-trip-sync-warning.png',
  'live-trip-error-no-cache.png',
  'live-trip-stale-location.png',
  'live-trip-cover-expired.png',
];

function assertLocked() {
  const existing = LOCKED.filter((f) => {
    try {
      execSync(`git cat-file -e origin/main:${f}`, { stdio: 'ignore', cwd: REPO_ROOT });
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
  if (diff) throw new Error(`Locked files modified:\n${diff}`);
}

// Per the agreed product spec, LiveRouteMap MAY use raster/fallback art for the
// empty, ready-to-start, permission-needed and tile-error states. What is NOT
// allowed is replacing the *active trip* map with a static image. This guard
// therefore verifies the real map is wired up and that the active/live branch
// mounts the real Leaflet/OpenStreetMap map instead of a static <img>.
function assertNoFakeMapSource() {
  const src = readFileSync(path.join(REPO_ROOT, 'apps/mobile/src/components/LiveRouteMap.jsx'), 'utf8');

  // The component must render the real interactive map for live tracking.
  if (!/MapContainer/.test(src) || !/TileLayer/.test(src)) {
    throw new Error('LiveRouteMap must render the real Leaflet map (MapContainer + TileLayer)');
  }
  if (!/openstreetmap/i.test(src)) {
    throw new Error('LiveRouteMap must use OpenStreetMap tiles for live tracking');
  }

  // Isolate the active/live render branch and confirm it mounts the real map.
  const liveBranch = src.match(/live-trip-map--live[\s\S]*?<\/MapContainer>/);
  if (!liveBranch) {
    throw new Error('Active trip state must mount the real <MapContainer> map');
  }
  // The active map branch must not swap in a static raster map image.
  if (/<img\b/i.test(liveBranch[0])) {
    throw new Error('Active trip map must not use a static <img> in place of the real map');
  }
}

function runSeed(mode) {
  execSync(`node scripts/qaTripStates.mjs ${mode}`, {
    cwd: path.join(REPO_ROOT, 'apps/backend'),
    stdio: 'inherit',
  });
}

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

async function ensureUser() {
  try {
    await api('/api/shared/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone: QA_PHONE, password: QA_PASSWORD, fullName: 'Trip QA' }),
    });
  } catch (e) {
    if (!/exists/i.test(String(e.message))) throw e;
  }
}

async function loginToken() {
  const data = await api('/api/shared/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: QA_PHONE, password: QA_PASSWORD }),
  });
  return data.token;
}

async function captureFrame(page, name) {
  await page.waitForTimeout(800);
  const text = await page.locator('.phone-frame').innerText();
  if (/share-track-map|route_map_bus_hero_clean/i.test(text)) {
    throw new Error('Static map asset text detected');
  }
  const staleChipLive =
    (await page.locator('.live-trip-chip--live').count()) > 0 &&
    /Last known location|may be outdated/i.test(text);
  if (staleChipLive) {
    throw new Error('Live label must not appear when location is stale');
  }
  // Live Trip must not fall through to Profile as the active nav tab.
  const activeNav = await page.locator('.nav-item.active').first().innerText().catch(() => '');
  if (/profile/i.test(activeNav)) {
    throw new Error(`Live Trip screen must not show Profile as active nav tab (got: ${activeNav.trim()})`);
  }
  await page.locator('.phone-frame').screenshot({ path: path.join(OUTPUT_DIR, name) });
}

async function loginUI(page, { denyGeo = false } = {}) {
  const context = page.context();
  if (!denyGeo) {
    await context.grantPermissions(['geolocation'], { origin: BASE_URL });
    await context.setGeolocation({ latitude: -15.398, longitude: 28.305 });
  }
  await page.goto(`${BASE_URL}/?qa=${Date.now()}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^log in$/i }).click();
  await page.fill('input[placeholder="+260 or email address"]', QA_PHONE);
  await page.fill('input[placeholder="Enter password"]', QA_PASSWORD);
  await page.locator('form.auth-form button[type="submit"]').click();
  await page.waitForSelector('.home-screen', { timeout: 30000 });
}

/** Stub OSM tile requests so tile errors never fire in sandbox environments. */
async function mockOsmTiles(ctx) {
  await ctx.route('**://*.tile.openstreetmap.org/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: STUB_TILE_PNG }),
  );
}

async function openLiveTrip(page) {
  await page.goto(`${BASE_URL}/#liveTrip`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.live-trip-screen', { timeout: 20000 });
  return;
  await page.locator('.bottom-nav').getByRole('button', { name: 'Cover', exact: true }).click();
  await page.waitForSelector('.cover-screen-board', { timeout: 15000 });
  await page.locator('.cover-screen-board__policy').click();
  await page.waitForSelector('.view-policy-screen', { timeout: 15000 });
  await page.getByRole('button', { name: /view full live map/i }).click();
  await page.waitForSelector('.live-trip-screen', { timeout: 15000 });
}

async function main() {
  assertLocked();
  assertNoFakeMapSource();
  await mkdir(OUTPUT_DIR, { recursive: true });
  await ensureUser();
  const token = await loginToken();

  const browser = await chromium.launch({ headless: true });

  runSeed('active-route');
  {
    const ctx = await browser.newContext();
    await mockOsmTiles(ctx);
    const page = await ctx.newPage();
    await loginUI(page);
    await openLiveTrip(page);
    await page.waitForSelector('.live-trip-map__canvas, .leaflet-container', { timeout: 45000 });
    await page.waitForTimeout(1500);
    const hasPolyline = await page.locator('.leaflet-interactive').count();
    if (hasPolyline < 1) throw new Error('Route polyline expected for active-route seed');
    await captureFrame(page, 'live-trip-active-route.png');
    await ctx.close();
  }

  runSeed('active-no-route');
  {
    const ctx = await browser.newContext();
    await mockOsmTiles(ctx);
    const page = await ctx.newPage();
    await loginUI(page);
    await openLiveTrip(page);
    await page.waitForSelector('.live-trip-map__canvas, .leaflet-container', { timeout: 45000 });
    await page.waitForTimeout(1500);
    const text = await page.locator('.live-trip-map').innerText();
    if (!/Route details are not available yet/i.test(text)) {
      throw new Error('No-route state must show route unavailable copy');
    }
    await captureFrame(page, 'live-trip-active-no-route.png');
    await ctx.close();
  }

  runSeed('active-cover-no-trip');
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginUI(page);
    await openLiveTrip(page);
    await page.waitForSelector('.live-trip-map', { timeout: 15000 });
    const text = await page.locator('.live-trip-map').innerText();
    if (!/No active trip/i.test(text)) throw new Error('Expected no active trip empty state');
    await captureFrame(page, 'live-trip-no-active-trip.png');
    await ctx.close();
  }

  runSeed('active-route');
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await ctx.clearPermissions();
    await loginUI(page, { denyGeo: true });
    await openLiveTrip(page);
    await page.waitForSelector('text=Location needed', { timeout: 15000 });
    await captureFrame(page, 'live-trip-location-needed.png');
    await ctx.close();
  }

  runSeed('active-route');
  {
    const ctx = await browser.newContext({ geolocation: { latitude: -15.398, longitude: 28.305 } });
    await ctx.grantPermissions([], { origin: BASE_URL });
    const page = await ctx.newPage();
    await loginUI(page, { denyGeo: true });
    await page.evaluate(() => {
      const original = navigator.geolocation.getCurrentPosition;
      navigator.geolocation.getCurrentPosition = (_s, e) => e?.({ code: 1 });
      navigator.geolocation.watchPosition = (_s, e) => {
        e?.({ code: 1 });
        return 0;
      };
      return original;
    });
    await openLiveTrip(page);
    const enableBtn = page.getByRole('button', { name: /enable location/i });
    if (await enableBtn.isVisible().catch(() => false)) {
      await enableBtn.click();
    }
    await page.waitForSelector('text=Location is turned off', { timeout: 15000 });
    await captureFrame(page, 'live-trip-location-denied.png');
    await ctx.close();
  }

  runSeed('active-route');
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.route('**://*.tile.openstreetmap.org/**', (route) => route.abort());
    await loginUI(page);
    await openLiveTrip(page);
    await page.waitForSelector('text=Map unavailable', { timeout: 15000 });
    await captureFrame(page, 'live-trip-map-offline.png');
    await ctx.close();
  }

  runSeed('active-route');
  {
    const ctx = await browser.newContext();
    await mockOsmTiles(ctx);
    const page = await ctx.newPage();
    const bundle = await api('/api/mobile/active-trip', {
      headers: { authorization: `Bearer ${token}` },
    });
    await loginUI(page);
    await page.evaluate(
      ({ key, data }) => sessionStorage.setItem(key, JSON.stringify(data)),
      {
        key: CACHE_KEY,
        data: { trip: bundle.trip, activeCover: bundle.activeCover, cachedAt: new Date().toISOString() },
      }
    );
    await page.route('**/api/mobile/active-trip', (route) => route.abort('failed'));
    await openLiveTrip(page);
    await page.waitForSelector('.live-trip-map__sync', { timeout: 15000 });
    await captureFrame(page, 'live-trip-sync-warning.png');
    await ctx.close();
  }

  runSeed('no-cover');
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.route('**/api/mobile/active-trip', (route) => route.abort('failed'));
    await loginUI(page);
    await openLiveTrip(page);
    await page.waitForSelector('text=Couldn’t load live trip', { timeout: 15000 });
    await captureFrame(page, 'live-trip-error-no-cache.png');
    await ctx.close();
  }

  runSeed('stale');
  {
    const ctx = await browser.newContext();
    await mockOsmTiles(ctx);
    const page = await ctx.newPage();
    await page.route('**/api/mobile/trips/*/location', (route) => route.abort());
    await loginUI(page);
    await openLiveTrip(page);
    await page.waitForSelector('.live-trip-map__canvas, .leaflet-container', { timeout: 45000 });
    await page.waitForTimeout(1500);
    await page.waitForSelector('.live-trip-chip--muted', { timeout: 10000 });
    const text = await page.locator('.live-trip-screen').innerText();
    if (!/outdated|Last known location|Last updated/i.test(text)) {
      throw new Error('Stale location must not show Live now');
    }
    const liveChip = await page.locator('.live-trip-chip--live').count();
    if (liveChip > 0) {
      throw new Error('Stale trip must not show Live chip');
    }
    await captureFrame(page, 'live-trip-stale-location.png');
    await ctx.close();
  }

  runSeed('cover-expired');
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginUI(page);
    await openLiveTrip(page);
    await page.waitForSelector('text=Cover expired', { timeout: 15000 });
    await captureFrame(page, 'live-trip-cover-expired.png');
    await ctx.close();
  }

  await browser.close();
  for (const shot of SHOTS) {
    const full = path.join(OUTPUT_DIR, shot);
    if (!existsSync(full) || statSync(full).size === 0) {
      throw new Error(`Missing or empty screenshot: ${shot}`);
    }
  }
  console.log('Live trip QA screenshots OK');
  for (const s of SHOTS) console.log(`  - ${s}`);
}

async function prismaExpireCover(coverId) {
  execSync(
    `node -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); await p.tripCover.update({where:{id:'${coverId}'},data:{endsAt:new Date(Date.now()-60000)}}); await p.$disconnect();"`,
    { cwd: path.join(REPO_ROOT, 'apps/backend'), stdio: 'inherit' }
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
