# SAFE staging smoke test checklist

Manual verification on the **staging** environment after deploy. Use real backend data only — no fake stats.

Print or copy this checklist for each staging deploy.

**Staging URLs (fill in):**

| Service | URL |
|---------|-----|
| API | `https://api.staging.example` |
| Mobile | `https://app.staging.example` |
| Dashboard | `https://admin.staging.example` |
| QR base | `https://app.staging.example` |

**Staging admin (not default dev credentials):**

- Email: ___________________________
- Password: (from secrets manager)

---

## Automated pre-deploy (CI / local)

Run before promoting build to staging:

```bash
cd apps/backend && npx tsc --noEmit
cd apps/backend && npx prisma migrate deploy
npm run build:mobile
npm run build:dashboard
npm --workspace apps/dashboard run smoke   # against staging API after deploy, or local API in CI
```

Mobile capture QA (`npm run qa:mobile`) is for **local dev only** — not run on staging servers.

---

## Manual staging checklist

Mark each item **PASS** / **FAIL** / **N/A**.

### Infrastructure

| # | Check | PASS | FAIL | Notes |
|---|--------|------|------|-------|
| 1 | `GET {API}/health` returns `{ ok: true }` | ☐ | ☐ | |
| 2 | Mobile loads at staging URL (HTTPS) | ☐ | ☐ | |
| 3 | Dashboard loads at staging URL | ☐ | ☐ | |
| 4 | `/q/{valid-code}` loads mobile SPA (not 404) | ☐ | ☐ | |
| 5 | `/q/invalid-code` shows error, no crash | ☐ | ☐ | |

### Dashboard (admin)

| # | Check | PASS | FAIL | Notes |
|---|--------|------|------|-------|
| 6 | Admin login with **staging** credentials (not `admin@safe.local`) | ☐ | ☐ | |
| 7 | Overview loads; metrics are zero or real (no fake/demo stats) | ☐ | ☐ | |
| 8 | Vehicles page loads | ☐ | ☐ | |
| 9 | Generate or view vehicle QR; download/copy works | ☐ | ☐ | |
| 10 | QR scan logs page loads (may be empty) | ☐ | ☐ | |
| 11 | Settings shows env warnings appropriate to staging | ☐ | ☐ | |

### Mobile (passenger)

| # | Check | PASS | FAIL | Notes |
|---|--------|------|------|-------|
| 12 | Register or login passenger works | ☐ | ☐ | |
| 13 | Buy cover flow reaches payment step | ☐ | ☐ | |
| 14 | Pending payment shows as pending (not active cover) | ☐ | ☐ | |
| 15 | Failed payment shows failed (not active cover) | ☐ | ☐ | |
| 16 | Successful payment activates cover (gateway or staging simulate) | ☐ | ☐ | |
| 17 | Active cover appears on Home/Cover only after payment success | ☐ | ☐ | |

### QR + trip + claims

| # | Check | PASS | FAIL | Notes |
|---|--------|------|------|-------|
| 18 | Scan QR with phone (or open `/q/{code}`); vehicle verifies | ☐ | ☐ | |
| 19 | Live trip starts only with active paid cover | ☐ | ☐ | |
| 20 | Stale/old location shows last known (not fake live movement) | ☐ | ☐ | |
| 21 | Claim submission completes; reference from backend | ☐ | ☐ | |
| 22 | Documents step shows upload-not-connected if storage disabled | ☐ | ☐ | |

### Admin operations

| # | Check | PASS | FAIL | Notes |
|---|--------|------|------|-------|
| 23 | Submitted claim appears in dashboard queue | ☐ | ☐ | |
| 24 | Admin can update claim status; timeline updates | ☐ | ☐ | |
| 25 | Support report from mobile appears in dashboard | ☐ | ☐ | |

### Profile / settings

| # | Check | PASS | FAIL | Notes |
|---|--------|------|------|-------|
| 26 | Notifications settings save without error | ☐ | ☐ | |
| 27 | Settings/legal/support show configured values or honest not-configured | ☐ | ☐ | |

### Data integrity

| # | Check | PASS | FAIL | Notes |
|---|--------|------|------|-------|
| 28 | No fake revenue, passengers, or trip counts on dashboard | ☐ | ☐ | |
| 29 | Disabled/expired QR not shown as active in dashboard | ☐ | ☐ | |
| 30 | Approved/paid claims only when backend status says so | ☐ | ☐ | |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Deploy | | | |
| QA / Ops | | | |

**Overall:** ☐ GO for pilot on staging  ☐ NO-GO — blockers: _______________

---

## Related docs

- [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md) — env vars, build commands, QR rewrite
- [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) — production blockers and dashboard readiness
