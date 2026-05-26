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

### Trusted Contacts screen (LOCKED — QA accepted)

**Branch / PR:** `cursor/trusted-contacts-a7cb` · [#18](https://github.com/Megamind33-tech/SAFE/pull/18)

**Do not redesign** the Trusted Contacts screen. Visual/layout direction is frozen unless the user explicitly requests changes.

**Locked UI / behavior** (see `apps/mobile/src/trusted-contacts-screen.css`, `TrustedContactsScreen.jsx`, `services/trustedContacts.js`):

- Trusted Contacts page layout, hero, header (+ back / add sheet)
- Empty state
- Contacts list state (avatar, meta line, verification line, Primary badge / edit control)
- Add contact bottom sheet
- Edit contact bottom sheet
- Delete confirmation sheet
- Duplicate phone inline warning (no duplicate creates)
- Sync-warning (stale-while-revalidate with cache)
- Error-no-cache state
- Phone masking display (`+260 97 *** 3456` — never show full saved numbers)
- Primary badge behavior (one primary per user)
- Bottom nav on this screen (Profile tab active; do not change nav system)

**QA capture:** `apps/mobile/scripts/capture-trusted-contacts.mjs` — regenerates eight `trusted-contacts-*.png` screenshots; fails fast on truncation, unmasked phones, duplicate creates, cache regression, inactive Profile tab.

**Allowed future changes only:**

1. API / integration fixes
2. Provider / backend bugs
3. Small copy tweaks
4. Accessibility improvements
5. Test / QA improvements

**Not allowed** without explicit user request: layout, spacing, typography, card design, nav design, icon style, screen structure, or other visual direction changes.

**Known limitation (preserve):**

- **Verified** badge appears only when the API returns `isVerified: true`.
- Do not fake verification status in the UI.
