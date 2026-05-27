# SAFE staging deployment — execution runbook

Operational steps to bring up **staging** (no new product features). Use with [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md) and [STAGING_SMOKE_TEST.md](./STAGING_SMOKE_TEST.md).

**Out of scope for this stage:** production deploy, partner dashboard access, QR Phase 2, Android safe-area device QA, fake QA staff seeds on staging.

---

## 0. Fill in staging URLs

| Service | Your URL |
|---------|----------|
| API | `https://api.____________` |
| Mobile | `https://app.____________` |
| Dashboard | `https://admin.____________` |

---

## 1. Environment files (secrets manager → host env)

Copy templates (do **not** commit filled secrets):

```bash
cp apps/backend/.env.staging.example apps/backend/.env
cp apps/mobile/.env.staging.example apps/mobile/.env
cp apps/dashboard/.env.staging.example apps/dashboard/.env
```

Edit all `REPLACE_*` and `staging.example` placeholders.

Or copy examples only if missing:

```bash
npm run staging:init-env
```

Validate before build:

```bash
npm run staging:validate
```

**Required backend values:**

- `SAFE_APP_ENV=staging`
- `JWT_SECRET` — strong, unique
- `DATABASE_URL` — persistent path on staging host
- `CORS_ORIGINS` — HTTPS mobile + dashboard origins
- `SAFE_QR_PUBLIC_BASE_URL` — HTTPS mobile URL (no trailing slash)
- `SAFE_DISABLE_DEFAULT_ADMIN=true`
- Payment policy: gateway **or** `SAFE_PAYMENT_SIMULATE_SUCCESS=true` (staging only)
- `SAFE_CLAIMS_UPLOAD_ENABLED=false`

**Mobile/dashboard:** `VITE_API_BASE_URL` = staging API; QA flags `false`.

---

## 2. Staging database

On the **staging host** (or CI with staging `DATABASE_URL`):

```bash
cd apps/backend
npx prisma migrate deploy
npx prisma generate
```

Do **not** run `npm run seed` on staging (creates `admin@safe.local`).

---

## 3. Staging admin

After migrate, on staging DB only:

```bash
cd apps/backend
SAFE_ADMIN_EMAIL="ops-admin@your-domain" \
SAFE_ADMIN_PASSWORD="<min-10-chars-from-secrets>" \
SAFE_DISABLE_DEFAULT_ADMIN=true \
npm run create-staging-admin
```

Creates `super_admin` if email is new. Disables `admin@safe.local` when present.

Then create additional staff in dashboard (**Staff users**) — do not share one password.

Do **not** run `SAFE_SEED_DASHBOARD_STAFF` or `seedDashboardStaff.mjs` on staging.

---

## 4. Build artifacts

From repo root (after `staging:validate`):

```bash
npm run staging:build
```

Outputs:

- `apps/backend/dist/` → API process
- `apps/mobile/dist/` → static host (+ `/q/*` rewrite)
- `apps/dashboard/dist/` → static host

---

## 5. Deploy

| Component | Deploy target | Notes |
|-----------|---------------|--------|
| Backend | `node apps/backend/dist/index.js` | Port `8080` or platform port; env from secrets |
| Mobile | `apps/mobile/dist/` | **Must** SPA fallback for `/q/*` |
| Dashboard | `apps/dashboard/dist/` | SPA fallback for `/` |

### `/q/*` rewrite

- **Cloudflare Pages:** `apps/mobile/public/_redirects` (copied into dist on build)
- **nginx:** [infra/staging/nginx-safe-staging.conf.example](../infra/staging/nginx-safe-staging.conf.example)

Verify: `https://app…/q/ANY-CODE` returns HTML with `<div id="root">`, not 404.

---

## 6. Post-deploy smoke

```bash
export STAGING_API_URL="https://api.your-domain"
export STAGING_MOBILE_URL="https://app.your-domain"
export STAGING_DASHBOARD_URL="https://admin.your-domain"
export STAGING_ADMIN_EMAIL="ops-admin@your-domain"
export STAGING_ADMIN_PASSWORD="<from-secrets>"

npm run staging:smoke
```

Then complete manual checklist: [STAGING_SMOKE_TEST.md](./STAGING_SMOKE_TEST.md).

---

## 7. Pre-promote gate (CI / local, not on staging servers)

```bash
cd apps/backend && npx tsc --noEmit
npm run build:mobile
npm run build:dashboard
npm --workspace apps/dashboard run smoke
npm run qa:mobile   # local dev servers only
```

---

## Checklist summary

| Step | Command / action |
|------|------------------|
| Env templates | Copy `.env.staging.example` → `.env` |
| Validate env | `npm run staging:validate` |
| Migrate | `npx prisma migrate deploy` (staging DB) |
| Staging admin | `npm run create-staging-admin` |
| Build | `npm run staging:build` |
| Deploy API + static sites | Platform-specific |
| QR rewrite | nginx / `_redirects` / CDN SPA mode |
| Remote smoke | `npm run staging:smoke` |
| Manual QA | [STAGING_SMOKE_TEST.md](./STAGING_SMOKE_TEST.md) |

---

## Related docs

- [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md) — architecture and env reference
- [DASHBOARD_RBAC.md](./DASHBOARD_RBAC.md) — staff roles; external partners blocked
- [PENDING_ANDROID_SAFE_AREA_QA.md](./PENDING_ANDROID_SAFE_AREA_QA.md) — device QA after staging is up
