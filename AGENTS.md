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

### Locked mobile screens

Do not change layout, spacing, typography, card design, nav design, icon style, screen structure, or visual direction on locked screens unless explicitly requested.

#### Claims (`cursor/claims-flow-9936` / PR #24)

**Claims is locked** (commit `7966790`).

**Locked (do not modify):**
- Claims main screen layout
- Claims empty state
- Claims list state
- Claim summary behavior
- Claim detail screen
- Claim status labels and pill behavior
- Claim timeline behavior
- Start claim eligibility step
- No eligible cover state
- Accident details step
- Documents / evidence step
- Review claim step
- Submitted claim state
- Duplicate warning / block behavior
- Upload-not-connected behavior
- Error-no-cache state
- Sync-warning state
- Claims bottom nav behavior
- QA-gated claims capture hooks

**Key files:**
- `apps/mobile/src/screens/ClaimsScreen.jsx`
- `apps/mobile/src/screens/ClaimDetailScreen.jsx`
- `apps/mobile/src/screens/ClaimFlowScreen.jsx`
- `apps/mobile/src/claims-screen.css`
- `apps/mobile/src/claim-detail-screen.css`
- `apps/mobile/src/claim-flow-screen.css`
- `apps/mobile/src/claim-submitted-screen.css`
- `apps/mobile/src/services/claims.js`
- `apps/mobile/src/utils/claimStatus.js`
- `apps/mobile/src/utils/claimsQa.js`

**Allowed future changes only:**
1. API / integration fixes
2. Backend claim / status bugs
3. Real document storage wiring
4. Small copy tweaks
5. Accessibility improvements
6. Test / QA improvements
7. Safe removal of deprecated legacy claim-flow files

Do not change layout, spacing, typography, card design, nav design, icon style, claim-flow structure, evidence flow, or visual direction unless explicitly requested.

**Behavior and copy to preserve:**
- No fake claims.
- No fake submitted state.
- No fake claim reference generated in the mobile UI.
- Submitted screen only appears after `POST /api/mobile/claims/:claimId/submit` returns success.
- Approved / Paid statuses only appear when backend returns those states.
- Draft claims must not look submitted.
- Pending / failed payment covers must not be eligible.
- Claim eligibility must come from backend.
- Duplicate decisions must follow backend: block / warn / allow.
- Document upload must not show uploaded unless backend returns `document.status = uploaded`.
- If `SAFE_CLAIMS_UPLOAD_ENABLED=false`, show: “Document upload is not connected yet.”
- QA hooks must remain gated by `import.meta.env.DEV && import.meta.env.VITE_CLAIMS_QA_CAPTURE === "true"`.
- Normal dev and production must not run QA hooks.
- Deprecated legacy claim flow files must remain unreachable unless safely removed in a future cleanup.
- Cached claims remain visible if refresh fails (sync warning, not full error).
- Full error only when there is no cached claims data.
- Fraud wording must stay careful: possible duplicate, may review, needs review — never “fraud detected” unless backend explicitly says so.

**QA (preserve):**
- Script: `apps/mobile/scripts/capture-claims.mjs` (`npm run claims:capture` from `apps/mobile` with `VITE_CLAIMS_QA_CAPTURE=true`)
- Seed: `apps/backend/scripts/qaClaimsSeed.mjs`
- Gating: `apps/mobile/src/utils/claimsQa.js`
- Fourteen screenshot states (fail fast if regressions):
  - `claims-empty.png`
  - `claims-list.png`
  - `claims-detail-submitted.png`
  - `claims-detail-needs-action.png`
  - `claims-start-eligibility.png`
  - `claims-no-eligible-cover.png`
  - `claims-accident-details.png`
  - `claims-documents.png`
  - `claims-review.png`
  - `claims-submitted.png`
  - `claims-duplicate-warning.png`
  - `claims-upload-not-connected.png`
  - `claims-error-no-cache.png`
  - `claims-sync-warning.png`

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

#### Profile sub-pages (other locked screens)

Home, Cover / Buy Cover, Payment Methods, Trusted Contacts, Help & Safety, Notifications, and Cover History / Detail remain locked per their respective branches; see workspace rules and PR history before editing.
