# AGENTS.md

## Cursor Cloud specific instructions

### Overview

SAFE is a minibus commuter micro-insurance monorepo (npm workspaces) with three services under `apps/`:

| Service | Port | Command |
|---------|------|---------|
| **Backend API** (Express + Prisma + SQLite) | 8080 | `npm run dev:backend` |
| **Mobile App** (Vite + React) | 5173 | `npm run dev:mobile` |
| **Dashboard** (Vite + React + Tailwind) | 5174 | `npm run dev:dashboard` |

### Setup

- **Backend setup** must run before the first `dev:backend` launch: use non-interactive steps (see below).
- The `npm --workspace apps/backend run setup` script uses `prisma migrate dev` which prompts interactively. Instead run:
  ```
  npm --workspace apps/backend run init:env
  cd apps/backend && node scripts/ensureSqliteFile.mjs && npx prisma migrate deploy && npx prisma generate && npm run seed
  ```
- Frontend `.env` files: copy from `.env.example` (both set `VITE_API_BASE_URL="http://127.0.0.1:8080"`).
- SQLite is file-based at `apps/backend/dev.db` — no external DB needed.

### Payment flow

Payments use a sandbox provider. The flow is:
1. `POST /api/mobile/cover/buy` → creates cover with `pending_payment` status + payment with `initiated` status
2. `POST /api/mobile/payment/confirm` → sets payment to `succeeded`, activates cover with real `startedAt`/`endsAt`
3. Cover only becomes `active` after payment confirmation

### Countdown timers

- `GET /api/time` returns `serverTime` for client clock offset
- `GET /api/mobile/cover/active` also returns `serverTime`
- Expired covers are automatically marked by the backend on every active/history fetch

### Dashboard auth

- Dashboard requires login — the shell redirects to `/login` if no token
- Default admin: `admin@safe.local` / `admin1234`
- All dashboard metrics come from real DB aggregate queries

### Lint / Test / Build

- No lint or test scripts defined. TypeScript: `cd apps/backend && npx tsc --noEmit`
- Build: `npm run build:mobile`, `npm run build:dashboard`
