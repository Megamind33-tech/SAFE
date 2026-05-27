# SAFE Android device test checklist

Manual verification on a **physical Android device** using the Capacitor debug build. Use a real backend (staging recommended) — no fake data.

**Device under test:** ___________________________  
**Android version:** ___________________________  
**APK build date / git SHA:** ___________________________  
**API URL (`VITE_API_BASE_URL`):** ___________________________

---

## Pre-test setup

- [ ] `apps/mobile/.env` copied from `.env.android.example` with **non-localhost** API URL
- [ ] `VITE_CLAIMS_QA_CAPTURE=false` and `VITE_QR_QA_CAPTURE=false`
- [ ] `npm run android:sync` run after env change
- [ ] APK installed or Run from Android Studio
- [ ] Phone on same network as API (or staging reachable over internet)

---

## Checklist

Mark each **PASS** / **FAIL** / **N/A**.

| # | Check | PASS | FAIL | Notes |
|---|--------|------|------|-------|
| 1 | App opens to SAFE splash/login (no white screen crash) | ☐ | ☐ | |
| 2 | Login / register works against configured API | ☐ | ☐ | |
| 3 | Home command center loads | ☐ | ☐ | |
| 4 | Cover tab loads; plans visible | ☐ | ☐ | |
| 5 | Payment not-configured / pending states behave honestly (no fake active cover) | ☐ | ☐ | |
| 6 | QR scanner asks for camera permission | ☐ | ☐ | |
| 7 | QR scanner scans valid SAFE vehicle QR | ☐ | ☐ | |
| 8 | Invalid / expired / disabled QR shows error UI (no crash) | ☐ | ☐ | |
| 9 | Vehicle verified screen appears after valid scan | ☐ | ☐ | |
| 10 | Live Trip asks for location permission | ☐ | ☐ | |
| 11 | Location denied shows honest blocked / enable state | ☐ | ☐ | |
| 12 | Location granted — trip starts only with active **paid** cover | ☐ | ☐ | |
| 13 | Claims flow completes (or honest empty / not-eligible state) | ☐ | ☐ | |
| 14 | Help & Safety opens | ☐ | ☐ | |
| 15 | Notifications screen saves / shows honest provider state | ☐ | ☐ | |
| 16 | Settings opens (locked layout unchanged) | ☐ | ☐ | |
| 17 | Logout works; returns to login | ☐ | ☐ | |
| 18 | No bottom nav overlap on primary CTAs | ☐ | ☐ | |
| 19 | No horizontal page overflow on 360–430px width | ☐ | ☐ | |
| 20 | App survives force-stop and reopen (session / cache sane) | ☐ | ☐ | |

---

## QR deep link note (expected for Phase 1)

| Test | Expected Phase 1 |
|------|------------------|
| Scan QR **inside SAFE app** | Works |
| Open `https://…/q/CODE` in Chrome | Opens **web** app, not installed APK |
| App Links (installed app from camera) | Phase 2 — not required PASS for this checklist |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Tester | | | |
| QA / Ops | | | |

**Overall:** ☐ GO for Android pilot testing  ☐ NO-GO — blockers: _______________

---

## Related docs

- [ANDROID_TEST_BUILD.md](./ANDROID_TEST_BUILD.md) — setup, build, install, env, permissions
