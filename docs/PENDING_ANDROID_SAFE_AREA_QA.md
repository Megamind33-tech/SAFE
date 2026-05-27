# Pending: physical Android safe-area QA (PR #36)

**Status:** Open — manual device verification **not yet completed**  
**Merged without device sign-off:** [PR #36](https://github.com/Megamind33-tech/SAFE/pull/36) — fake in-app status bar removal (`9:41`, signal/battery chrome)  
**Do not revert** the merge. Automated web/mobile QA passed on merge.

## What shipped on `main`

- Removed `MiniStatusBar` from splash, onboarding, login, and signup.
- Replaced fake top chrome with CSS safe-area variables (`--safe-top` / `--safe-bottom`) and `viewport-fit=cover` in `apps/mobile/index.html`.

## Pending manual QA

When a machine with the Android SDK is available:

1. Build APK from **latest `main`** (see [ANDROID_TEST_BUILD.md](./ANDROID_TEST_BUILD.md)).
2. Install on a **physical Android device** (not emulator-only sign-off).
3. Walk these flows: **splash**, **onboarding**, **login**, **home**, **QR scanner**, **live trip**.
4. Confirm:

| Check | PASS | FAIL | Notes |
|--------|------|------|-------|
| No fake `9:41` or duplicate in-app status row | ☐ | ☐ | |
| No content hidden behind the **real** Android system status bar | ☐ | ☐ | |
| No huge empty top gap (safe-area padding reasonable) | ☐ | ☐ | |
| No bottom nav overlap on primary CTAs | ☐ | ☐ | |
| Login / onboarding / home / QR / live trip look clean | ☐ | ☐ | |

Record device model, Android version, APK git SHA, and API URL on [ANDROID_DEVICE_TEST_CHECKLIST.md](./ANDROID_DEVICE_TEST_CHECKLIST.md).

## If device test fails

Open a **small hotfix only** — do not redesign screens:

- Branch: `cursor/android-safe-area-hotfix`
- Scope: safe-area / status-bar **spacing only** (padding, insets, Capacitor status bar config if needed).
- Out of scope: layout, typography, cards, colors, buttons, nav style.

## Sign-off

| Tester | Device / Android | Git SHA | Date | Result |
|--------|------------------|---------|------|--------|
| | | | | ☐ PASS ☐ FAIL |

When PASS, update this file status to **Complete** and check the safe-area rows on the device checklist.
