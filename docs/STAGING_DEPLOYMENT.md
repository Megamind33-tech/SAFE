# SAFE staging deployment guide

Prepare SAFE for a **staging** environment (pre-production smoke testing). This is not production deployment.

Last updated: staging deployment preparation phase (main @ `80357987`).

## Phase 1 — Deployment audit

### Ready in codebase

| Area | Status | Notes |
|------|--------|-------|
| Backend build | Ready | `npm run build` → `apps/backend/dist/index.js` |
| Backend start | Ready | `npm start` runs `node dist/index.js` |
| Mobile build | Ready | `npm run build:mobile` → `apps/mobile/dist/` (Vite SPA) |
| Dashboard build | Ready | `npm run build:dashboard` → `apps/dashboard/dist/` (Vite SPA) |
| Prisma migrations | Ready | `npx prisma migrate deploy` (11 migrations) |
| Health check | Ready | `GET /health` |
| Dashboard smoke | Ready | `npm --workspace apps/dashboard run smoke` |
| Mobile QA capture | Ready | `npm run qa:mobile` (local/dev only) |
| QR public entry | Ready in app | Mobile handles `/q/{code}` when host rewrites to SPA |
| Admin dashboard | Ready | Real data, no fake stats |
| Payment simulate guard | Ready | Forced off when `SAFE_APP_ENV=production` |

### Requires server / platform configuration

| Area | Action required |
|------|-----------------|
| `DATABASE_URL` | Staging database file or Postgres URL on host |
| `JWT_SECRET` | Strong unique secret (not dev default) |
| `CORS_ORIGINS` | Staging mobile + dashboard origins |
| `SAFE_QR_PUBLIC_BASE_URL` | Staging mobile public URL (e.g. `https://staging.safe.co.zm`) |
| `/q/*` rewrite | Route `/q/*` → mobile `index.html` (see below) |
| Admin credentials | **Do not** use `admin@safe.local` / `admin1234` on staging |
| Payment gateway | Set `SAFE_PAYMENT_GATEWAY_ENABLED=true` when provider wired; otherwise use simulate only in non-prod staging |
| Legal/support URLs | Set if mobile Settings/Legal should show real links |
| Claims upload | Keep `SAFE_CLAIMS_UPLOAD_ENABLED=false` until blob storage configured |
| Notifications | Keep SMS/email flags `false` until providers wired |
| Static hosting | Serve mobile + dashboard `dist/` with SPA fallback |
| TLS | HTTPS for staging mobile (QR links, geolocation) |

### Database location

- **Local dev:** SQLite at `apps/backend/dev.db` (path from `DATABASE_URL`)
- **Staging (pilot):** SQLite file on persistent volume is acceptable for controlled staging
- **Multi-instance staging:** Use Postgres and update `DATABASE_URL` accordingly

Prisma schema is SQLite today; Postgres migration is a separate ops decision.

### Default dev admin (local only)

Seed script (`npm run seed`) creates:

- Email: `admin@safe.local`
- Password: `admin1234`

**Never use these on staging.** See [Admin credential safety](#admin-credential-safety) below.

---

## Phase 2 — Staging environment variables

Copy and fill for your staging host. Do not commit secrets.

### Backend (`apps/backend/.env` or platform env)

| Variable | Required | Staging guidance |
|----------|----------|------------------|
| `SAFE_APP_ENV` | Recommended | `staging` |
| `DATABASE_URL` | **Yes** | e.g. `file:/var/safe/staging.db` or Postgres URL |
| `PORT` | Optional | Default `8080` |
| `JWT_SECRET` | **Yes** | Long random string; not `dev-secret-change-me` |
| `CORS_ORIGINS` | **Yes** | Comma-separated staging frontends, e.g. `https://app.staging.safe.co.zm,https://admin.staging.safe.co.zm` |
| `SAFE_QR_PUBLIC_BASE_URL` | **Yes** | Public mobile URL, e.g. `https://app.staging.safe.co.zm` |
| `SAFE_SUPPORT_PHONE` | Recommended | Support line shown in mobile Help |
| `SAFE_SUPPORT_EMAIL` | Recommended | Support email |
| `SAFE_TERMS_URL` | Recommended | HTTPS terms page |
| `SAFE_PRIVACY_URL` | Recommended | HTTPS privacy page |
| `SAFE_CLAIMS_POLICY_URL` | Optional | Claims policy URL |
| `SAFE_PAYMENT_GATEWAY_ENABLED` | **Yes** | `true` when provider wired; `false` if using simulate on staging only |
| `SAFE_PAYMENT_SIMULATE_SUCCESS` | **Yes** | `false` when gateway live; `true` only for non-prod staging without gateway |
| `SAFE_CARD_PAYMENTS_ENABLED` | Optional | `false` until card provider wired |
| `SAFE_CLAIMS_UPLOAD_ENABLED` | **Yes** | `false` until blob storage configured |
| `SAFE_NOTIFICATION_SMS_ENABLED` | Optional | `false` until SMS provider wired |
| `SAFE_NOTIFICATION_EMAIL_ENABLED` | Optional | `false` until email provider wired |
| `SAFE_ADMIN_EMAIL` | **Yes (staging)** | Staging admin email (see script below) |
| `SAFE_ADMIN_PASSWORD` | **Yes (staging)** | Strong password; inject via secrets manager |
| `SAFE_DISABLE_DEFAULT_ADMIN` | Recommended | `true` on staging to deactivate `admin@safe.local` |

Other flags (leave default unless needed):

- `SAFE_EMERGENCY_PHONE`, `SAFE_SUPPORT_HOURS`
- `SAFE_DATA_EXPORT_ENABLED`, `SAFE_ACCOUNT_DELETION_ENABLED` — keep `false` until wired
- `SAFE_ALLOW_DEV_VEHICLE_AUTO_CREATE` — `false` on staging

### Mobile (`apps/mobile/.env` at build time)

| Variable | Required | Staging value |
|----------|----------|---------------|
| `VITE_API_BASE_URL` | **Yes** | Staging API URL, e.g. `https://api.staging.safe.co.zm` |
| `VITE_CLAIMS_QA_CAPTURE` | **Yes** | `false` (or unset) |
| `VITE_QR_QA_CAPTURE` | **Yes** | `false` (or unset) |

Rebuild mobile after changing `VITE_*` variables.

### Dashboard (`apps/dashboard/.env` at build time)

| Variable | Required | Staging value |
|----------|----------|---------------|
| `VITE_API_BASE_URL` | **Yes** | Same staging API URL as mobile |

---

## Phase 3 — Build and deploy commands

Run from repository root unless noted.

### One-time / CI setup

```bash
npm install
```

### Backend

```bash
cd apps/backend
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
npm start
```

Or from root:

```bash
npm --workspace apps/backend run build
npm run start:backend
```

**First deploy on staging** (after migrate, before or after start):

```bash
cd apps/backend
SAFE_ADMIN_EMAIL="ops-admin@staging.example" \
SAFE_ADMIN_PASSWORD="<strong-secret>" \
SAFE_DISABLE_DEFAULT_ADMIN=true \
npm run create-staging-admin
```

Optional seed data (dev routes/vehicle only — not required for staging):

```bash
npm run seed   # creates default admin + sample vehicle; skip on staging if using create-staging-admin only
```

### Mobile

```bash
# Set VITE_API_BASE_URL in apps/mobile/.env first
npm run build:mobile
# Deploy apps/mobile/dist/ to static host
```

### Dashboard

```bash
# Set VITE_API_BASE_URL in apps/dashboard/.env first
npm run build:dashboard
# Deploy apps/dashboard/dist/ to static host
```

### QA (pre-staging verification — run in CI or locally, not on staging servers)

```bash
npm run qa:mobile
npm --workspace apps/dashboard run smoke
```

Mobile QA requires local dev servers and QA Vite flags — **do not enable QA flags on staging builds**.

### Verification (merge gate)

```bash
cd apps/backend && npx tsc --noEmit
cd apps/backend && npx prisma migrate deploy
npm run build:mobile
npm run build:dashboard
npm --workspace apps/dashboard run smoke
```

---

## Phase 4 — QR `/q/*` rewrite

Vehicle QR codes encode URLs like:

```text
{SAFE_QR_PUBLIC_BASE_URL}/q/{code}
```

Example: `https://app.staging.safe.co.zm/q/SAFE-LSK-8KJ29X`

The mobile SPA must load for all `/q/*` paths so client routing can verify the code.

### nginx example

```nginx
server {
  listen 443 ssl;
  server_name app.staging.safe.co.zm;

  root /var/www/safe-mobile/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Explicit QR entry (optional; covered by SPA fallback above)
  location /q/ {
    try_files $uri $uri/ /index.html;
  }
}
```

### Cloudflare Pages

- Build output: `apps/mobile/dist`
- **Single Page Application:** enabled (or `_redirects` file):

```text
/q/*  /index.html  200
/*    /index.html  200
```

### S3 + CloudFront

- Upload `dist/` to bucket
- CloudFront custom error: 403/404 → `/index.html` with response 200
- Or Lambda@Edge / CloudFront Function for `/q/*` rewrite

### Railway / generic static

- Serve `dist/` as static site with **SPA fallback** to `index.html`
- Confirm deep link `/q/SAFE-LSK-8KJ29X` returns HTML shell, not 404

### QR smoke test (manual on staging)

1. Open `https://<staging-mobile>/q/SAFE-LSK-8KJ29X` (or a live vehicle code from dashboard)
2. Confirm SAFE mobile loads (login or verify screen)
3. Open `https://<staging-mobile>/q/SAFE-INV-000000`
4. Confirm invalid code shows error UI — app must not crash
5. Confirm scan appears in dashboard **QR scans** when authenticated scan runs

---

## Admin credential safety

### Staging must NOT use

- `admin@safe.local` / `admin1234` (local seed only)

### Create staging admin

After `prisma migrate deploy`:

```bash
cd apps/backend
SAFE_ADMIN_EMAIL="ops-admin@your-staging-domain" \
SAFE_ADMIN_PASSWORD="<generate-strong-password>" \
SAFE_DISABLE_DEFAULT_ADMIN=true \
npm run create-staging-admin
```

This creates a `super_admin` if missing and optionally sets `isActive=false` on the default seed admin.

### Rotate admin password

1. Create a new admin user with a new email via the same script (different `SAFE_ADMIN_EMAIL`), or
2. Use dashboard/API password change when implemented; until then, update via Prisma/direct DB hash with `hashPassword` in a one-off script, or
3. Re-run `create-staging-admin` only for **new** emails (existing users are not overwritten)

### Disable default admin

Set `SAFE_DISABLE_DEFAULT_ADMIN=true` when running `create-staging-admin`.

Verify in dashboard Settings → warnings should not show default-credentials risk if default admin is inactive.

### Local development unchanged

Local `npm run setup` / `npm run seed` still creates `admin@safe.local` for dev. Staging script is opt-in via env vars.

---

## Staging vs production

| Item | Staging | Production |
|------|---------|------------|
| `SAFE_APP_ENV` | `staging` | `production` |
| Payment simulate | Allowed if gateway not wired | **Forbidden** (forced off in code) |
| QA Vite flags | **Off** | **Off** |
| Default admin | **Disabled** | **Disabled** |
| JWT secret | Unique staging secret | Unique production secret |
| Database | Staging DB (isolated) | Production DB |

See also: [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md), [STAGING_SMOKE_TEST.md](./STAGING_SMOKE_TEST.md).

---

## Remaining blockers before staging goes live

1. Host provisioning (API + mobile static + dashboard static)
2. Env secrets injected on platform
3. `/q/*` rewrite verified on staging mobile URL
4. Staging admin created; default admin disabled
5. CORS lists staging origins
6. Payment: gateway or explicit staging decision on simulate flag
7. Optional: legal/support URLs for realistic mobile Settings/Help
