# SAFE Android test build

Install and test the existing SAFE mobile React/Vite app on **real Android devices** using [Capacitor](https://capacitorjs.com/). This is **not** a Play Store release.

Last updated: Android test build phase (Capacitor 8).

---

## Overview

| Item | Value |
|------|-------|
| Capacitor app ID | `zm.co.safe.app` |
| App name | SAFE |
| Web bundle | `apps/mobile/dist/` (Vite build) |
| Android project | `apps/mobile/android/` |
| Debug APK (after build) | `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` |

The Android shell is a WebView wrapper around the same SPA used in the browser. No mobile screen redesign — same React app, packaged for device testing.

---

## Phase 1 — Required tools

1. **Android Studio** — latest stable (includes SDK Manager)
2. **Android SDK** — API 34+ recommended (Capacitor 8 default)
3. **JDK 17+** — bundled with Android Studio or install separately
4. **Physical Android phone** — USB debugging enabled
5. **USB cable** — data-capable

### Enable USB debugging on phone

Settings → About phone → tap Build number 7 times → Developer options → **USB debugging** ON.

---

## Phase 2 — Setup commands

From repository root:

```bash
npm install
```

Configure API URL for device ( **not localhost** ):

```bash
cp apps/mobile/.env.android.example apps/mobile/.env
# Edit VITE_API_BASE_URL — staging HTTPS or LAN IP reachable from phone
```

Install Capacitor deps (already in `apps/mobile/package.json`):

```bash
cd apps/mobile
npm install
```

First-time Android platform (already in repo after PR merge):

```bash
npm run build
npx cap add android   # skip if android/ already exists
npx cap sync android
```

Open in Android Studio:

```bash
npx cap open android
```

---

## Phase 3 — Build commands

### Standard workflow (after code or env changes)

```bash
cd apps/mobile
npm run build          # Vite → dist/
npx cap sync android   # copy dist/ into android project
```

Or use the npm script:

```bash
npm run android:sync
```

### Run on connected device (CLI)

```bash
npm run android:run
```

Equivalent to: build → sync → `npx cap run android`

### Open Android Studio

```bash
npm run android:open
```

Then: **Run ▶** with your phone selected.

### Build debug APK (Gradle)

```bash
npm run android:apk
```

Or manually:

```bash
cd apps/mobile
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

APK output:

```text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Phase 4 — Install APK on phone

### Option A — Android Studio Run

Connect phone via USB → allow debugging → Run ▶ in Android Studio.

### Option B — adb install

```bash
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### Option C — Copy APK to phone

Transfer `app-debug.apk` (email, Drive, etc.) → open on phone → allow install from unknown sources if prompted.

---

## Phase 5 — Android API base URL

**Do not use `localhost` or `127.0.0.1` on a physical device** — the phone cannot reach your laptop’s loopback.

| Environment | Example `VITE_API_BASE_URL` |
|-------------|----------------------------|
| Staging (recommended) | `https://staging-api.safe.co.zm` |
| LAN dev backend | `http://192.168.1.50:8080` (same Wi‑Fi; may need cleartext — see Known issues) |
| Emulator → host machine | `http://10.0.2.2:8080` (Android emulator only) |

Set in `apps/mobile/.env` **before** `npm run build`. Rebuild and sync after any change:

```bash
npm run android:sync
```

Template: `apps/mobile/.env.android.example`

**QA flags must stay false:**

```bash
VITE_CLAIMS_QA_CAPTURE=false
VITE_QR_QA_CAPTURE=false
```

---

## Phase 6 — QR and deep links

### Phase 1 (this build) — in-app testing

| Feature | Works in installed app? |
|---------|-------------------------|
| In-app QR scanner (Profile → Scan vehicle QR) | Yes — camera permission required |
| Manual QR code entry | Yes |
| `/q/{code}` HTTPS links in browser | Opens **browser**, not installed app (unless App Links configured) |

Vehicle QR stickers encode URLs like `https://app.staging.safe.co.zm/q/SAFE-LSK-8KJ29X`. For device testing:

- Use **in-app scanner** or **manual entry** inside the installed SAFE app.
- Opening the URL in Chrome will load the **web** app, not the Capacitor shell.

### Phase 2 (later) — Android App Links

Not in scope for this PR. Future work:

- Configure `assetlinks.json` on the mobile domain
- Add `intent-filter` with `android:autoVerify="true"` for `/q/*`
- Allows phone camera / Chrome to open the **installed** SAFE app directly

See [Capacitor Deep Links](https://capacitorjs.com/docs/guides/deep-links) when ready.

---

## Phase 7 — Android permissions

Declared in `apps/mobile/android/app/src/main/AndroidManifest.xml`:

| Permission | Purpose |
|------------|---------|
| `INTERNET` | API calls |
| `CAMERA` | QR scanner (`html5-qrcode`) |
| `ACCESS_FINE_LOCATION` | Live Trip GPS |
| `ACCESS_COARSE_LOCATION` | Live Trip fallback |

Runtime prompts are handled by the WebView when the app requests camera/location. No unnecessary dangerous permissions added.

---

## Phase 8 — npm scripts reference

| Script | Command |
|--------|---------|
| `android:sync` | `npm run build && npx cap sync android` |
| `android:open` | `npx cap open android` |
| `android:run` | build + sync + `npx cap run android` |
| `android:apk` | build + sync + `./gradlew assembleDebug` |

---

## Known issues

1. **localhost API** — fails on real devices; use staging URL or LAN IP.
2. **HTTP LAN backend** — Android blocks cleartext by default. Use HTTPS staging, or add a `network_security_config` for dev-only LAN (not included in default build).
3. **Camera in WebView** — requires HTTPS origin or Capacitor localhost; works in packaged app. Deny permission → scanner shows permission-needed state (expected).
4. **Location in WebView** — user must grant location; denied state must remain honest (Live Trip).
5. **QR sticker URLs** — external `/q/*` links open browser until App Links (Phase 2).
6. **Large APK** — debug build includes unoptimized assets; acceptable for pilot testing only.
7. **CI without Android SDK** — `android:apk` requires local Android Studio / SDK; web QA runs in CI without native build.

---

## Related docs

- [ANDROID_DEVICE_TEST_CHECKLIST.md](./ANDROID_DEVICE_TEST_CHECKLIST.md) — real-device manual checklist
- [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md) — staging API and env setup
- [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) — web QA and responsive coverage
