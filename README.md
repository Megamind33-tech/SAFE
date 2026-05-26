# SAFE (Monorepo)

SAFE contains two separate products that share one backend API:

1. **Mobile app** (passengers/commuters) in `apps/mobile`
2. **Admin/Partner dashboard** (SAFE ops + partners) in `apps/dashboard`

The backend lives in `apps/backend` and exposes strict namespaces:

- `GET /health`
- `/api/shared/*` (auth, shared utilities)
- `/api/mobile/*` (passenger-only)
- `/api/dashboard/*` (admin/partner-only)

## Quick Start (Local)

1. Install dependencies at repo root
2. Backend:
   1. Run the backend setup once:
      - `npm --workspace apps/backend run setup`
   2. Start API on `http://127.0.0.1:8080`
3. Mobile app: start on `http://127.0.0.1:5173`
4. Dashboard: start on `http://127.0.0.1:5174`

### Default dev accounts

- Dashboard admin:
  - Email: `admin@safe.local`
  - Password: `admin1234`

## Superseded PRs

Open PRs **#2**, **#6**, **#7**, and **#25** must **not** be merged or rebased onto current `main`. Close them as superseded only.  
Details: [docs/SUPERSEDED_PRS.md](docs/SUPERSEDED_PRS.md)

## Repo scripts

- `npm run dev:backend`
- `npm run dev:mobile`
- `npm run dev:dashboard`
