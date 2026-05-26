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

Do not change layout, typography, card design, nav design, icon style, screen structure, or visual direction on locked screens unless explicitly requested.

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
 71f777c (Document locked Claims flow in AGENTS.md (PR #24, 7966790))

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

