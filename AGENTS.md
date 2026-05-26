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

#### Cover / Buy Cover (`cursor/cover-purchase-flow-9936` / PR #23)

**Cover / Buy Cover flow is locked.**

**Locked (do not modify):**
- Cover screen layout
- Active cover state
- No active cover / plan list state
- Plan selection state
- Review purchase state
- Payment method selection state
- Payment pending state
- Payment failed state
- Payment not configured state
- Cover activated state
- Expired cover state
- Error-no-cache state
- Sync-warning state
- Cover bottom nav behavior
- Real timer behavior
- Duplicate active cover protection
- Legacy route guard behavior

**Key files:**
- `apps/mobile/src/screens/CoverScreen.jsx`
- `apps/mobile/src/screens/CoverPlanSelectScreen.jsx`
- `apps/mobile/src/screens/CoverReviewScreen.jsx`
- `apps/mobile/src/screens/CoverPaymentScreen.jsx`
- `apps/mobile/src/screens/CoverPurchaseStatusScreen.jsx`
- `apps/mobile/src/cover-flow-screen.css`
- `apps/mobile/src/services/cover.js`
- `apps/mobile/src/App.jsx` (cover flow routing, `coverFlow` state, legacy `choose`/`payment` redirect only)
- `apps/backend/src/lib/coverPurchase.ts`
- `apps/backend/src/lib/coverPlans.ts`
- `apps/backend/src/routes/mobile.ts` (cover plans, active, purchase, status endpoints only — do not change unrelated routes)

**Allowed future changes only:**
1. API / payment integration fixes
2. Backend payment / provider bugs
3. Small copy tweaks
4. Accessibility improvements
5. Test / QA improvements
6. Real payment gateway wiring when provider credentials exist

Do not change layout, spacing, typography, card design, nav design, icon style, purchase flow structure, or visual direction unless explicitly requested.

**Behavior to preserve:**
- No fake payment success.
- No fake policy activation.
- No fake policy ID before backend creates one.
- No active cover unless backend cover exists, payment succeeded, and `endsAt` is in the future.
- Payment pending must not activate cover.
- Payment failed must not activate cover.
- Payment not configured must not activate cover.
- Expired cover must not show active.
- Timer must derive from real `endsAt`, update live, stop at zero, and never go negative.
- Plans must come from `GET /api/mobile/cover/plans`, not hardcoded UI data.
- Payment method selection must use real saved payment method IDs.
- Card payments remain disabled unless `SAFE_CARD_PAYMENTS_ENABLED=true`.
- Duplicate active cover remains blocked unless `SAFE_ALLOW_COVER_STACKING=true`.
- No in-app mobile money PIN prompts.
- Legacy `ChooseCoverScreen_LEGACY` and `PaymentScreen_LEGACY` must remain unreachable or safely mapped into the new flow (`choose` → `coverPlans`, `payment` → `coverReview` / `coverPay`).

**QA (preserve):**
- Script: `apps/mobile/scripts/capture-cover-flow.mjs`
- Backend helper: `apps/backend/scripts/qaCoverPayment.mjs` (`succeed`, `fail`, `seed-expired`, `clear-covers`)
- Env flags for deterministic QA: `SAFE_PAYMENT_GATEWAY_ENABLED`, `SAFE_PAYMENT_SIMULATE_SUCCESS`, `SAFE_CARD_PAYMENTS_ENABLED`, `SAFE_ALLOW_COVER_STACKING`
- Twelve screenshot states (fail fast if regressions):
  - `cover-active.png`
  - `cover-no-active-plans.png`
  - `cover-plan-selected.png`
  - `cover-review.png`
  - `cover-payment-methods.png`
  - `cover-payment-pending.png`
  - `cover-payment-failed.png`
  - `cover-activated.png`
  - `cover-expired.png`
  - `cover-error-no-cache.png`
  - `cover-sync-warning.png`
  - `cover-payment-not-configured.png`

**Merge note:**
Before merging PR #23, ensure Home PR #22 is merged first or rebase PR #23 on current `main` so Cover does not carry stale Home diffs.
