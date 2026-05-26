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

### Locked mobile screens (Profile sub-pages)

Do not change layout, spacing, typography, card design, nav design, icon style, screen structure, or visual direction on locked screens unless explicitly requested.

#### Home (`cursor/home-command-center-9936` / PR #22)

**Home is locked.**

**Locked (do not modify):**
- Home command center layout
- Header / greeting behavior
- Cover hero active / no-cover / expired / payment-pending states
- Real cover timer behavior
- Quick action grid
- Live trip / map preview behavior
- Claim summary section
- Recent activity section
- Safety note
- Error-no-cache state
- Sync-warning state
- Home bottom nav behavior

**Key files:**
- `apps/mobile/src/screens/HomeScreen.jsx`
- `apps/mobile/src/home-screen.css`
- `apps/mobile/src/services/home.js`
- `apps/mobile/src/components/HomeCoverHero.jsx`
- `apps/mobile/src/components/HomeMapPreview.jsx`

**Allowed future changes only:**
1. API / integration fixes
2. Backend data bugs
3. Small copy tweaks
4. Accessibility improvements
5. Test / QA improvements
6. Real notification unread-count integration when backend exists

Do not change layout, spacing, typography, card design, nav design, icon style, map visual direction, or screen structure unless explicitly requested.

**Behavior and copy to preserve:**
- No fake maps.
- No fake demo stats.
- No hardcoded user name.
- No cartoon hero assets.
- Active cover must only show when backend cover exists and `endsAt` is in the future.
- Expired cover must never show as active.
- Timer must derive from `endsAt` and must not go negative.
- Cached home summary remains visible if refresh fails (sync warning, not full error).
- Full error only when there is no cached home data.
- Live map only renders when real trip / map data exists.
- Recent activity must come from real covers, claims, or trusted-contact updates.
- Quick actions must route to real existing screens / flows.

**QA (preserve):**
- Script: `apps/mobile/scripts/capture-home.mjs`
- Ten screenshot states (fail fast if regressions):
  - `home-active-cover.png`
  - `home-no-cover.png`
  - `home-expired-cover.png`
  - `home-payment-pending.png`
  - `home-live-trip-map.png`
  - `home-no-active-trip.png`
  - `home-latest-claim.png`
  - `home-no-claim.png`
  - `home-error-no-cache.png`
  - `home-sync-warning.png`

#### Settings (`cursor/settings-a7cb` / PR #21)

**Settings is locked.**

**Locked (do not modify):**
- Settings screen layout
- Account section
- Privacy and data section
- Legal section
- App section
- Personal details sheet
- Login and security sheet
- Privacy sheet
- Delete account two-step flow
- Logout confirmation flow
- Error-no-cache state
- Sync-warning state
- Profile bottom nav behavior on this screen

**Key files:**
- `apps/mobile/src/screens/SettingsScreen.jsx`
- `apps/mobile/src/settings-screen.css`
- `apps/mobile/src/services/settings.js`
- `apps/mobile/src/profile-screen.css` (only `settings-screen-board` bottom-nav rules)

**Allowed future changes only:**
1. API / integration fixes
2. Backend / config bugs
3. Small copy tweaks
4. Accessibility improvements
5. Test / QA improvements

**Behavior and copy to preserve:**
- Account data must come from real API / session data.
- Phone numbers must remain masked in UI.
- Legal links must come from env-backed config only.
- No fake legal URLs.
- Data export must not fake success when disabled.
- Account deletion must not fake success when disabled.
- Delete account requires typing `DELETE` exactly.
- Logout must show confirmation before clearing session.
- Environment row only appears in development builds.
- Language and currency remain disabled unless fully supported.
- Two-step verification remains “Coming later” until wired.
- Cached settings remain visible if refresh fails (sync warning, not full error).
- Full error only when there is no cached data.

**QA (preserve):**
- Script: `apps/mobile/scripts/capture-settings.mjs`
- Eleven screenshot states (fail fast if regressions):
  - `settings-main.png`
  - `settings-personal-details.png`
  - `settings-login-security.png`
  - `settings-privacy-sheet.png`
  - `settings-legal-not-configured.png`
  - `settings-delete-step-one.png`
  - `settings-delete-confirm-disabled.png`
  - `settings-delete-not-connected.png`
  - `settings-logout-confirm.png`
  - `settings-error-no-cache.png`
  - `settings-sync-warning.png`
