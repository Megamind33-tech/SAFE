# SAFE staging deployment guide

Prepare SAFE for a **staging** environment (pre-production smoke testing and real-device validation). This is not production deployment.

Last updated: staging execution toolkit on `main`.

**Execution runbook:** [STAGING_EXECUTION.md](./STAGING_EXECUTION.md) — step-by-step commands (`staging:validate`, `staging:build`, `staging:smoke`).

---

## Phase 1 — Deployment target plan

Fill in your actual hostnames before deploy. Example subdomain plan shown below.

| # | Area | Staging plan | Notes |
|---|------|--------------|-------|
| 1 | **Backend API host** | `https://api.staging.safe.example` | Node.js process running `apps/backend/dist/index.js` on port `8080` (or platform-assigned port) |
| 2 | **Mobile app host** | `https://app.staging.safe.example` | Static SPA from `apps/mobile/dist/` |
| 3 | **Dashboard host** | `https://admin.staging.safe.example` | Static SPA from `apps/dashboard/dist/` |
| 4 | **Database choice** | SQLite file on persistent volume (pilot) | Prisma schema is SQLite today. Use Postgres only if multi-instance staging is required (separate ops decision) |
| 5 | **Domain/subdomain plan** | `api.*`, `app.*`, `admin.*` under one staging domain | Keep API and frontends on separate origins; list all in `CORS_ORIGINS` |
| 6 | **HTTPS requirement** | **Required** | QR links, geolocation, and secure cookies depend on HTTPS for mobile |
| 7 | **`/q/*` rewrite requirement** | **Required on mobile host** | Vehicle QR URLs are `{SAFE_QR_PUBLIC_BASE_URL}/q/{code}` — must serve mobile `index.html` for all `/q/*` paths |
| 8 | **Admin account setup** | Staging-only admin via `create-staging-admin` script | **Never** use `admin@safe.local` / `admin1234` on staging |
| 9 | **Payment mode for staging** | Gateway wired **or** explicit simulate decision | If no provider yet: `SAFE_PAYMENT_GATEWAY_ENABLED=false` and `SAFE_PAYMENT_SIMULATE_SUCCESS=true` (non-prod only). If gateway wired: simulate `false` |
| 10 | **Claims upload mode for staging** | `SAFE_CLAIMS_UPLOAD_ENABLED=false` | Keep off until blob storage is configured; mobile shows honest “upload not connected” state |

### Architecture diagram

```text
                    ┌─────────────────────────┐
                    │  admin.staging.example  │  Dashboard SPA
                    └───────────┬─────────────┘
                                │ HTTPS API calls
┌───────────────────────────────┼───────────────────────────────┐
│  app.staging.example          │                               │
│  (mobile SPA + /q/* rewrite)  │     api.staging.example       │
└───────────────────────────────┘     (Express + Prisma)          │
         │ QR deep links                    │                     │
         └──────────────────────────────────┘                     │
                                          SQLite / Postgres DB ◄──┘
```

### Ready in codebase vs requires server config

| Ready in codebase | Requires server / platform config |
|-------------------|-----------------------------------|
| Backend build (`npm run build`) → `dist/index.js` | Inject secrets (`JWT_SECRET`, admin password) |
| Mobile/dashboard Vite builds → `dist/` | TLS certificates |
| `GET /health` | `DATABASE_URL` on persistent storage |
| Prisma migrations (`npx prisma migrate deploy`) | `CORS_ORIGINS` for staging frontends |
| QR client routing for `/q/{code}` | `SAFE_QR_PUBLIC_BASE_URL` matches mobile public URL |
| Dashboard smoke + capture scripts | `/q/*` SPA rewrite on mobile host |
| Responsive capture scripts | Staging admin created; default admin disabled |
| Payment simulate guard (forced off in production) | Payment gateway or explicit simulate policy |

### Database location

- **Local dev:** `apps/backend/dev.db` (from `DATABASE_URL`)
- **Staging (pilot):** SQLite on a persistent volume, e.g. `file:/var/safe/staging.db`
- **Multi-instance staging:** Postgres URL in `DATABASE_URL` (schema migration is a separate ops task)

### Default dev admin (local only)

`npm run seed` creates:

- Email: `admin@safe.local`
- Password: `admin1234`

**Never use these on staging.**

---

## Phase 2 — Environment files

Copy templates to your secrets manager or platform env UI. **Do not commit filled-in secrets.**

Templates in repo:

| File | Purpose |
|------|---------|
| `apps/backend/.env.staging.example` | Backend staging variables |
| `apps/mobile/.env.staging.example` | Mobile build-time variables |
| `apps/dashboard/.env.staging.example` | Dashboard build-time variables |

### Backend (required / recommended)

| Variable | Required | Staging guidance |
|----------|----------|------------------|
| `SAFE_APP_ENV` | Recommended | `staging` |
| `DATABASE_URL` | **Yes** | Persistent SQLite or Postgres URL |
| `JWT_SECRET` | **Yes** | Long random string; not `dev-secret-change-me` |
| `CORS_ORIGINS` | **Yes** | `https://app.staging.example,https://admin.staging.example` |
| `SAFE_QR_PUBLIC_BASE_URL` | **Yes** | `https://app.staging.example` (no trailing slash) |
| `SAFE_SUPPORT_PHONE` | Recommended | Shown in mobile Help |
| `SAFE_SUPPORT_EMAIL` | Recommended | Shown in mobile Help / Settings |
| `SAFE_TERMS_URL` | Recommended | HTTPS terms page |
| `SAFE_PRIVACY_URL` | Recommended | HTTPS privacy page |
| `SAFE_CLAIMS_POLICY_URL` | Optional | Claims policy URL |
| `SAFE_PAYMENT_GATEWAY_ENABLED` | **Yes** | `true` when provider wired; `false` if using simulate on staging only |
| `SAFE_PAYMENT_SIMULATE_SUCCESS` | **Yes** | `false` when gateway live; `true` only for non-prod staging without gateway |
| `SAFE_CARD_PAYMENTS_ENABLED` | Optional | `false` until card provider wired |
| `SAFE_CLAIMS_UPLOAD_ENABLED` | **Yes** | `false` until blob storage configured |
| `SAFE_NOTIFICATION_SMS_ENABLED` | Optional | `false` until SMS provider wired |
| `SAFE_NOTIFICATION_EMAIL_ENABLED` | Optional | `false` until email provider wired |
| `SAFE_ADMIN_EMAIL` | **Yes (staging)** | Staging ops admin email |
| `SAFE_ADMIN_PASSWORD` | **Yes (staging)** | Strong password via secrets manager |
| `SAFE_DISABLE_DEFAULT_ADMIN` | Recommended | `true` on staging |

### Mobile (build time)

| Variable | Staging value |
|----------|---------------|
| `VITE_API_BASE_URL` | `https://api.staging.example` |
| `VITE_CLAIMS_QA_CAPTURE` | `false` |
| `VITE_QR_QA_CAPTURE` | `false` |

Rebuild mobile after changing `VITE_*` variables.

### Dashboard (build time)

| Variable | Staging value |
|----------|---------------|
| `VITE_API_BASE_URL` | Same staging API URL as mobile |

---

## Phase 3 — Admin security

### Staging must NOT use

- `admin@safe.local` / `admin1234` (local seed only)

### Create staging admin

After `npx prisma migrate deploy` on the **staging database**:

```bash
cd apps/backend
SAFE_ADMIN_EMAIL="ops-admin@your-staging-domain" \
SAFE_ADMIN_PASSWORD="<generate-strong-password-min-10-chars>" \
SAFE_DISABLE_DEFAULT_ADMIN=true \
npm run create-staging-admin
```

This script:

1. Creates a `super_admin` user if the email does not exist (does **not** overwrite existing passwords)
2. When `SAFE_DISABLE_DEFAULT_ADMIN=true`, sets `isActive=false` on `admin@safe.local` if present

### Rotate admin password

- Create a new admin with a different `SAFE_ADMIN_EMAIL`, or
- Update password hash via a one-off ops script using `hashPassword` from `apps/backend/src/lib/auth.ts`

Re-running `create-staging-admin` for an **existing** email does not change the password.

### Local development unchanged

Local `npm run setup` / `npm run seed` still creates `admin@safe.local` for dev. The staging script is opt-in via env vars and should only be run against the staging database.

---

## Phase 4 — QR routing

Vehicle QR codes encode:

```text
{SAFE_QR_PUBLIC_BASE_URL}/q/{code}
```

Example: `https://app.staging.example/q/SAFE-LSK-8KJ29X`

The mobile SPA must load for all `/q/*` paths so client routing can verify the code.

### nginx

```nginx
server {
  listen 443 ssl;
  server_name app.staging.example;

  root /var/www/safe-mobile/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /q/ {
    try_files $uri $uri/ /index.html;
  }
}
```

### Cloudflare Pages

- Build output: `apps/mobile/dist`
- Enable **Single Page Application** mode, or add `_redirects`:

```text
/q/*  /index.html  200
/*    /index.html  200
```

### S3 + CloudFront

- Upload `dist/` to bucket
- CloudFront custom error: 403/404 → `/index.html` with response 200
- Or CloudFront Function / Lambda@Edge for `/q/*` rewrite

### Railway / generic static host

- Serve `dist/` as static site with **SPA fallback** to `index.html`
- Confirm deep link `/q/SAFE-LSK-8KJ29X` returns HTML shell, not 404

### QR smoke test requirements (manual on staging)

| Test | Expected |
|------|----------|
| Open `/q/SAFE-LSK-*` (valid live code) | Mobile app loads; vehicle verifies |
| Valid QR scan while logged in | Verification succeeds; trip/cover flow available |
| `/q/SAFE-INV-000000` or unknown code | Error UI; app does not crash |
| Expired/disabled QR (from dashboard) | Error state with honest reason |
| Authenticated scan | Row appears in dashboard **QR scans** (`QrScanLog`) |

---

## Phase 5 — Build and migration commands

Run from repository root unless noted.

### One-time setup

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

**First deploy on staging** (after migrate):

```bash
cd apps/backend
SAFE_ADMIN_EMAIL="ops-admin@staging.example" \
SAFE_ADMIN_PASSWORD="<strong-secret>" \
SAFE_DISABLE_DEFAULT_ADMIN=true \
npm run create-staging-admin
```

Optional dev seed (creates default admin + sample vehicle — **skip on staging** if using `create-staging-admin` only):

```bash
npm run seed
```

### Mobile

```bash
# Copy apps/mobile/.env.staging.example → apps/mobile/.env and set VITE_API_BASE_URL
npm run build:mobile
# Deploy apps/mobile/dist/ to mobile static host (with /q/* rewrite)
```

### Dashboard

```bash
# Copy apps/dashboard/.env.staging.example → apps/dashboard/.env and set VITE_API_BASE_URL
npm run build:dashboard
# Deploy apps/dashboard/dist/ to dashboard static host
```

### QA (pre-staging verification — CI / local, not on staging servers)

```bash
npm run qa:mobile
npm --workspace apps/dashboard run smoke
npm --workspace apps/dashboard run capture
npm --workspace apps/dashboard run responsive:capture
npm --workspace apps/mobile run responsive:capture
```

Mobile QA requires local dev servers. **Do not enable QA Vite flags on staging builds.**

### Verification gate

```bash
cd apps/backend && npx tsc --noEmit
cd apps/backend && npx prisma migrate deploy
npm run build:mobile
npm run build:dashboard
npm --workspace apps/dashboard run smoke
```

---

## Staging vs production

| Item | Staging | Production |
|------|---------|------------|
| `SAFE_APP_ENV` | `staging` | `production` |
| Payment simulate | Allowed if gateway not wired | **Forbidden** (forced off in code) |
| QA Vite flags | **Off** | **Off** |
| Default admin | **Disabled** | **Disabled** |
| JWT secret | Unique staging secret | Unique production secret |
| Database | Isolated staging DB | Production DB |

### Automated post-deploy smoke

```bash
export STAGING_API_URL="https://api.staging.example"
export STAGING_MOBILE_URL="https://app.staging.example"
export STAGING_DASHBOARD_URL="https://admin.staging.example"
export STAGING_ADMIN_EMAIL="ops-admin@staging.example"
export STAGING_ADMIN_PASSWORD="<from-secrets>"
npm run staging:smoke
```

See also: [STAGING_EXECUTION.md](./STAGING_EXECUTION.md), [STAGING_SMOKE_TEST.md](./STAGING_SMOKE_TEST.md), [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md).

---

## Remaining blockers before staging goes live

1. Host provisioning (API + mobile static + dashboard static)
2. Env secrets injected on platform
3. `/q/*` rewrite verified on staging mobile URL
4. Staging admin created; default admin disabled
5. CORS lists staging origins
6. Payment: gateway or explicit staging decision on simulate flag
7. Legal/support URLs for realistic mobile Settings/Help (optional but recommended)
8. Manual checklist in [STAGING_SMOKE_TEST.md](./STAGING_SMOKE_TEST.md)
9. Real-device responsive check (phone + laptop/tablet)
