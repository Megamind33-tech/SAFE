# AGENTS.md

## Cursor Cloud specific instructions

### Overview

SAFE is a minibus commuter micro-insurance monorepo (npm workspaces) with three services under `apps/`:

| Service | Port | Command |
|---------|------|---------|
| **Backend API** (Express + Prisma + SQLite) | 8080 | `npm run dev:backend` |
| **Mobile App** (Vite + React) | 5173 | `npm run dev:mobile` |
| **Dashboard** (Vite + React + Tailwind) | 5174 | `npm run dev:dashboard` |

### Setup gotchas

- **Backend setup** must run before the first `dev:backend` launch: `npm --workspace apps/backend run setup`. This creates `.env`, the SQLite file, runs Prisma migrations, and seeds an admin user (`admin@safe.local` / `admin1234`).
- The `setup` script uses `prisma migrate dev` which is **interactive** (prompts for a migration name). For non-interactive environments, run the steps separately:
  ```
  npm --workspace apps/backend run init:env
  cd apps/backend && node scripts/ensureSqliteFile.mjs && npx prisma migrate deploy && npx prisma generate && npm run seed
  ```
- Frontend `.env` files must be copied from `.env.example` before starting dev servers (both just set `VITE_API_BASE_URL="http://127.0.0.1:8080"`).
- No separate database server is required — SQLite is file-based at `apps/backend/dev.db`.

### Lint / Test / Build

- No lint or test scripts are defined in `package.json`. TypeScript type-checking can be run manually: `cd apps/backend && npx tsc --noEmit`.
- Build commands: `npm run build:mobile`, `npm run build:dashboard`, `npm --workspace apps/backend run build`.

### Default accounts

See `README.md` for default dev credentials.

### Payment Methods screen (LOCKED — QA accepted)

**Do not redesign** the Payment Methods screen. Visual/layout direction is frozen unless the user explicitly requests changes.

**Locked UI / behavior** (see `apps/mobile/src/payment-methods-screen.css`, `PaymentMethodsScreen.jsx`, `PaymentLogo.jsx`):

- Payment Methods page layout, heading, bottom nav
- Saved Airtel default card layout (CSS grid: logo | title+phone; Default badge on row 2)
- Empty state, sync-warning (stale-while-revalidate), error-no-cache states
- Add-payment-method bottom sheet layout (Visa row: Coming soon below subtitle)
- Duplicate-number flow (green notice, not red error)
- Payment logo assets from `paymentAssets.ts` only (72×56 wrappers, contained images)

**QA capture** (`apps/mobile/scripts/capture-payment-methods.mjs`, commit `226e103`+):

- Hard-refreshes Vite (`--force`, cache disabled, storage cleared)
- Fails fast if stale CSS or layout regression (grid/badge/phone/sheet assertions)
- Regenerate after CSS changes: stop Vite → clear `.vite` cache → delete `payment-methods-*.png` → restart dev → run script

**Allowed future changes only:**

1. Real API / integration fixes
2. Payment provider bug fixes
3. Small copy tweaks
4. Accessibility or test improvements

**Not allowed** without explicit user request: spacing, typography, card layout, bottom nav, logo sizing, colors, backgrounds, or other visual direction changes.
