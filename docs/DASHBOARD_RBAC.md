# Dashboard staff roles and permissions (RBAC)

Operations dashboard access is **not** a single shared admin login. Each staff member has a role; the backend enforces permissions on every API route.

## Staff roles

| Role | Purpose |
|------|---------|
| `super_admin` | Full access; manage staff users and roles |
| `admin` | Broad operations; claims, payments, fleet — no staff management |
| `operations_manager` | Vehicles, QR, partners, trips, support overview |
| `claims_officer` | Claims queue and status (not mark paid) |
| `finance_officer` | Payments, covers, mark claim paid when approved |
| `support_agent` | Support reports and passenger lookup (read-only claims) |
| `fleet_manager` | Vehicles, QR, live trips |
| `partner_manager` | Partners and QR scan performance (internal staff) |
| `auditor` | Read-only across permitted pages |

### External partner roles (blocked from dashboard)

| Role | Dashboard access |
|------|------------------|
| `transport_partner` | **Blocked** — no global fleet/claims data until row-level partner scoping ships |
| `insurance_partner` | **Blocked** — same |

Partner organizations should receive **`partner_manager`** (or other internal staff) accounts created by a super admin — not legacy partner enum logins on the ops dashboard.

## Permission model

Permissions are defined in `apps/backend/src/lib/dashboardPermissions.ts` (source of truth). Examples:

- `dashboard.view` — required for any dashboard API access
- `staff.manage` — Staff Users page and `/api/dashboard/staff`
- `claims.approve` / `claims.reject` / `claims.mark_paid` — separate claim mutations
- `qr.generate` / `qr.disable` — QR mutations
- `support.update` — support report workflow

Frontend nav and buttons use the same permission names from `GET /api/dashboard/session`. **Backend rejection is authoritative** if the UI is bypassed.

## First admin setup

### Local development

- Seed creates `admin@safe.local` / `admin1234` with role `super_admin` (see `apps/backend/src/seed.ts`).
- Optional QA staff: `SAFE_SEED_DASHBOARD_STAFF=true npm run seed` in backend (password `staffqa123`).

### Staging / production

1. Set `SAFE_ADMIN_EMAIL` and `SAFE_ADMIN_PASSWORD` and run `create-staging-admin` on the target database.
2. Set `SAFE_DISABLE_DEFAULT_ADMIN=true` to deactivate `admin@safe.local` after the real super admin exists.
3. Use **Staff Users** (super admin) to create additional staff — do not share one super-admin password across people.

## QA staff accounts (non-production)

| Email | Role | Password (QA seed) |
|-------|------|---------------------|
| superadmin@safe.local | super_admin | staffqa123 |
| claims@safe.local | claims_officer | staffqa123 |
| support@safe.local | support_agent | staffqa123 |
| finance@safe.local | finance_officer | staffqa123 |
| fleet@safe.local | fleet_manager | staffqa123 |
| auditor@safe.local | auditor | staffqa123 |

Do not create these accounts in production.

## Production checklist

- [ ] No shared `admin@safe.local` in production (`SAFE_DISABLE_DEFAULT_ADMIN=true`)
- [ ] Each operator has their own staff account and role
- [ ] Super admin count ≥ 2 active (avoid lockout)
- [ ] Auditors verified read-only (API returns 403 on PATCH/POST)
- [ ] Support agents cannot approve claims or change payments (API tested)
- [ ] Finance cannot approve claims without `claims.approve` permission

## Hotfix branch

Spacing-only dashboard fixes unrelated to RBAC: use normal feature branches. RBAC changes: extend `dashboardPermissions.ts` and route middleware together.
