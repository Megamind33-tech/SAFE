# SAFE staging smoke test checklist

Manual verification on the **staging** environment after deploy. Use real backend data only — no fake stats.

Print or copy this checklist for each staging deploy.

**Staging URLs (fill in before test):**

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
npm --workspace apps/dashboard run smoke
npm --workspace apps/dashboard run capture
npm --workspace apps/dashboard run responsive:capture
npm --workspace apps/mobile run responsive:capture
```

`npm run qa:mobile` is for **local dev only** — not run on staging servers.

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
| 10 | QR scan logs page loads; new scans appear after phone test | ☐ | ☐ | |

### Mobile (passenger)

| # | Check | PASS | FAIL | Notes |
|---|--------|------|------|-------|
| 11 | Register or login passenger works | ☐ | ☐ | |
| 12 | Buy cover flow reaches payment step | ☐ | ☐ | |
| 13 | Pending payment shows as pending (not active cover) | ☐ | ☐ | |
| 14 | Failed payment shows failed (not active cover) | ☐ | ☐ | |
| 15 | Successful payment activates cover (gateway or staging simulate) | ☐ | ☐ | |
| 16 | Active cover appears on Home/Cover only after payment success | ☐ | ☐ | |

### QR + trip + claims

| # | Check | PASS | FAIL | Notes |
|---|--------|------|------|-------|
| 17 | Scan QR with phone (or open `/q/{code}`); vehicle verifies | ☐ | ☐ | |
| 18 | Live trip starts only with active paid cover | ☐ | ☐ | |
| 19 | Claim submission completes; reference from backend | ☐ | ☐ | |
| 20 | Documents step shows upload-not-connected if storage disabled | ☐ | ☐ | |

### Admin operations

| # | Check | PASS | FAIL | Notes |
|---|--------|------|------|-------|
| 21 | Submitted claim appears in dashboard queue | ☐ | ☐ | |
| 22 | Admin can update claim status; timeline updates | ☐ | ☐ | |
| 23 | Support report from mobile appears in dashboard | ☐ | ☐ | |

### Profile / settings

| # | Check | PASS | FAIL | Notes |
|---|--------|------|------|-------|
| 24 | Notifications settings save without error | ☐ | ☐ | |
| 25 | Settings/legal/support show configured values or honest not-configured | ☐ | ☐ | |

### Data integrity

| # | Check | PASS | FAIL | Notes |
|---|--------|------|------|-------|
| 26 | No fake revenue, passengers, or trip counts on dashboard | ☐ | ☐ | |
| 27 | Disabled/expired QR not shown as active in dashboard | ☐ | ☐ | |
| 28 | Approved/paid claims only when backend status says so | ☐ | ☐ | |

### Responsive (real devices)

| # | Check | PASS | FAIL | Notes |
|---|--------|------|------|-------|
| 29 | Mobile responsive check on real phone (360–430px): no horizontal scroll, CTAs above nav | ☐ | ☐ | Device: _______ |
| 30 | Dashboard responsive check on laptop/tablet: sidebar/menu usable, tables scroll in container | ☐ | ☐ | Device: _______ |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Deploy | | | |
| QA / Ops | | | |

**Overall:** ☐ GO for pilot on staging  ☐ NO-GO — blockers: _______________

---

## Related docs

- [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md) — target plan, env vars, build commands, QR rewrite
- [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) — production blockers and responsive QA
