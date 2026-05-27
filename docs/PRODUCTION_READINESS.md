# SAFE production readiness

Pilot / production-readiness guide for the SAFE monorepo.

Last updated: staging deployment prep (main @ `34fcb8d`).

## Staging deployment

Pre-production staging setup (not production deploy):

- [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md) — target plan, env templates, build commands, QR rewrite, admin security
- [STAGING_SMOKE_TEST.md](./STAGING_SMOKE_TEST.md) — manual staging checklist (incl. real-device responsive checks)

Env templates: `apps/backend/.env.staging.example`, `apps/mobile/.env.staging.example`, `apps/dashboard/.env.staging.example`

Staging admin: `cd apps/backend && SAFE_ADMIN_EMAIL=... SAFE_ADMIN_PASSWORD=... SAFE_DISABLE_DEFAULT_ADMIN=true npm run create-staging-admin`

## Android device test build

Capacitor wraps the mobile SPA for real-device testing (not Play Store release):

- [ANDROID_TEST_BUILD.md](./ANDROID_TEST_BUILD.md) — setup, build APK, API URL, permissions, QR deep link notes
- [ANDROID_DEVICE_TEST_CHECKLIST.md](./ANDROID_DEVICE_TEST_CHECKLIST.md) — 20-point manual device checklist

Env template: `apps/mobile/.env.android.example` — use staging or LAN API; QA flags off.

## Responsive QA coverage

Layout hardening pass — no visual redesign. Validates overflow, bottom-nav clearance, dashboard sidebar behavior, and contained table scroll.

### Supported viewport ranges

| Surface | Widths tested |
|---------|----------------|
| Mobile app | 360px, 390px (reference), 430px |
| Dashboard tablet | 768px, 1024px |
| Dashboard desktop | 1280px, 1366px, 1440px |

Mobile uses a centered phone frame capped at 430px; 360px is the minimum supported passenger width.

### Responsive capture commands

```bash
npm --workspace apps/mobile run responsive:capture
npm --workspace apps/dashboard run responsive:capture
```

Mobile responsive capture requires backend on `:8080` and mobile dev on `:5173`.

Dashboard responsive capture requires backend on `:8080` and dashboard dev on `:5174`.

### Assertions (fail-fast)

- No page-level horizontal overflow (mobile or dashboard)
- Primary CTAs remain above bottom nav (mobile)
- QR scanner frame fits viewport
- Dashboard tables scroll inside `overflow-x-auto` wrappers only
- Tablet sidebar is icon-compact (`768px–1279px`); full labels at `1280px+`
- Mobile dashboard exposes hamburger navigation below `768px`

### Known layout limitations

- Dashboard wide tables (6+ columns) use horizontal scroll inside the table container on tablet — not card view
- Mobile desktop preview (`min-width: 520px`) uses a fixed 884px-tall phone frame for QA; real devices use full viewport height
- Detail panels on dashboard stack below tables below `1280px` (not overlay drawers)
- Settings sheets on mobile may use generous bottom clearance (existing design); content remains scrollable

## Admin dashboard readiness

### What staff can manage in pilot

- **Overview** — real KPIs (covers, payments, claims, QR scans, trips, passengers) with activity panels
- **Vehicles** — fleet list, search/filters, QR generate/regenerate/disable, suspend/activate, linked covers
- **Partners** — operator fleet summary, real cover/scan counts (no fake earnings)
- **Covers** — policy list with active/pending/expired/failed filters and detail drawer
- **Payments** — gateway status, reconciliation notes, payment detail
- **Claims** — full admin queue with timeline, metadata-only documents label, status actions
- **Live trips** — active/stale/ended buckets from real trip tracking (stale ≠ live)
- **QR scans** — global scan audit log with result counts
- **Support** — report queue with status updates and persisted admin notes
- **Passengers** — masked phone list and activity summary
- **Settings** — configured/not-configured flags and production warnings (no secrets exposed)
- **Drivers** — existing driver onboarding (unchanged)

### Still blocked / not in dashboard

- Partner commission / earnings payouts
- Fraud analytics prototype pages (not routed)
- Manual “mark paid” without backend webhook
- Live map animation or fake fleet telemetry
- Production deployment actions from dashboard

### Safe for pilot when configured

- Empty database shows clean empty states (zeros, not placeholders)
- Dashboard uses backend APIs only — no fake stats
- Production warnings visible on Settings when simulate flag, default JWT, or missing QR URL detected

### Must configure before public launch

- Rotate default admin credentials
- Set `JWT_SECRET`, `CORS_ORIGINS`, `SAFE_QR_PUBLIC_BASE_URL`
- Wire payment provider + webhook
- Configure claims blob storage if upload enabled
- Verify `/q/*` rewrite on production host

### Dashboard QA capture

```bash
npm --workspace apps/dashboard run capture
```

Screenshots: login, overview, vehicles, QR, partners, covers, payments, claims, live trips, support, users, settings, empty/error states.

### Dashboard API (completion stage)

| Area | API |
|------|-----|
| Overview | `GET /api/dashboard/overview`, `GET /metrics`, `GET /readiness` |
| Vehicles | `GET/POST/PATCH /vehicles`, QR + scans, `GET /vehicles/:id/covers` |
| Partners | `GET /partners`, `GET /partners/:id` |
| Covers | `GET /covers?status=&search=`, `GET /covers/:id` |
| Payments | `GET /payments`, `GET /payments/:id`, `GET /payments/config` |
| Claims | `GET/PATCH /claims/:id` |
| Trips | `GET /trips?bucket=active|stale|ended` |
| QR scans | `GET /qr/scans` |
| Support | `GET/PATCH /support-reports/:id` (adminNote) |
| Passengers | `GET /users`, `GET /users/:id` |

## Phase 1 — Readiness audit

### Production-ready

- Mobile passenger flows (Home, Cover, Claims, Live Trip, QR Phase 1, Profile) use real APIs
- Backend mobile API: auth, cover, claims, QR, trip tracking, support reports
- QR `/q/{code}` public URL + `QrScanLog` audit trail
- Prisma migrations via `prisma migrate deploy`
- Dashboard control room: vehicles, QR, partners, covers, payments, claims, support

### QA / demo only

- `SAFE_PAYMENT_SIMULATE_SUCCESS` — forced off in production
- `VITE_CLAIMS_QA_CAPTURE` / `VITE_QR_QA_CAPTURE` — dev build + env gated
- Seed scripts and `npm run qa:mobile` — local QA only
- Default admin credentials — rotate before pilot

### Missing for pilot

- Real payment provider + webhook
- Claims blob storage when upload enabled
- Hosting `/q/*` SPA rewrite
- Production secrets and CORS
- Postgres for multi-instance (SQLite OK for controlled pilot)

### Dangerous if deployed now

- Default `JWT_SECRET`
- Payment simulate flag (mitigated in production)
- Auto-create vehicles on verify (disabled in production)
- Legacy `cover/buy` and `claims/create` endpoints
- Mobile Chat prototype screen

### Required env vars

See `apps/backend/.env.example` for full list. Minimum production:

- `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `SAFE_APP_ENV=production`
- `SAFE_QR_PUBLIC_BASE_URL=https://safe.co.zm`
- `SAFE_PAYMENT_GATEWAY_ENABLED=true` when provider wired
- `SAFE_PAYMENT_SIMULATE_SUCCESS=false`

Mobile/dashboard: `VITE_API_BASE_URL` only.

QA flags off in production: `VITE_*_QA_CAPTURE`, `SAFE_PAYMENT_SIMULATE_SUCCESS`.

### Legacy behavior

- `POST /api/mobile/cover/buy` — use `/cover/purchase`
- `POST /api/mobile/claims/create` — use claim flow
- Mobile legacy screen redirects for `choose` / `payment`

### Dashboard controls (90% stage)

| Area | API |
|------|-----|
| Vehicles | `GET /api/dashboard/vehicles`, QR generate/regenerate/disable, scans |
| Partners | `GET /api/dashboard/partners`, `GET /partners/:id` |
| Covers | `GET /api/dashboard/covers?status=` |
| Payments | `GET /api/dashboard/payments`, webhook placeholder |
| Claims | `GET/PATCH /api/dashboard/claims/:id` |
| Support | `GET/PATCH /api/dashboard/support-reports/:id` |

## Migration

```bash
cd apps/backend && npx prisma migrate deploy
```

## QR rewrite

Route `/q/*` to mobile SPA `index.html` on `safe.co.zm`.

## Payment webhook

`POST /api/shared/webhooks/payment` — `{ paymentId, status, reference }`  
`GET /api/shared/webhooks/payment` — placeholder docs.

No cover activation before `succeeded`.

## Smoke tests

```bash
cd apps/backend && npx tsc --noEmit
cd apps/backend && npx prisma migrate deploy
npm run build:mobile
npm run build:dashboard
npm run qa:mobile
npm --workspace apps/dashboard run smoke
npm --workspace apps/dashboard run capture
npm --workspace apps/mobile run responsive:capture
npm --workspace apps/dashboard run responsive:capture
```

Mobile QA requires backend on `:8080`, mobile dev on `:5173`, and the mobile dev server started with `VITE_CLAIMS_QA_CAPTURE=true` and `VITE_QR_QA_CAPTURE=true` (QR/claims QA hooks are Vite build-time flags). For cover/home purchase seeds, enable `SAFE_PAYMENT_GATEWAY_ENABLED=true` and `SAFE_PAYMENT_SIMULATE_SUCCESS=true` in backend `.env`.

`dashboard-empty-state.png` is captured only when the fleet table has zero vehicles; when seeded vehicles exist, vehicle detail/QR shots serve as the empty-fleet substitute.

## Remaining blockers

1. Payment provider credentials
2. Document storage
3. Managed database
4. Production hosting + secrets
5. Notification providers
