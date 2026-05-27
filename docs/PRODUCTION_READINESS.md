# SAFE production readiness

Pilot / production-readiness guide for the SAFE monorepo.

Last updated: 90% readiness stage.

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
```

## Remaining blockers

1. Payment provider credentials
2. Document storage
3. Managed database
4. Production hosting + secrets
5. Notification providers
