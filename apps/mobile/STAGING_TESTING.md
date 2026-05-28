# SAFE Consumer Mobile App — Staging Testing Manual & Release Notes

This guide provides instructions to compile, deploy, and verify the SAFE minibus commuter micro-insurance consumer mobile app on the staging environment.

---

## 1. Staging Environment Configuration

Staging targets a deployed staging backend API host. Ensure you have copied the environment configuration correctly:

* **Staging Template:** `apps/mobile/.env.staging.example`
* **Target Staging Host:** `https://api.staging.safe.co.zm`

### Setup Instructions
1. Copy the staging environment template to your local `.env` configuration file inside `apps/mobile/`:
   ```bash
   cp apps/mobile/.env.staging.example apps/mobile/.env
   ```
2. Verify that the `.env` file contains:
   ```env
   VITE_API_BASE_URL="https://api.staging.safe.co.zm"
   VITE_CLAIMS_QA_CAPTURE=false
   VITE_QR_QA_CAPTURE=false
   ```
   *(Note: QA Capture hooks must remain disabled on staging and production environments to preserve layout security guards).*

---

## 2. Compile & Android Deployment Process

Once the staging environment is set up, build the client app and synchronize it with the Capacitor Android project:

### Step 1: Compile Client Assets
Compile the production-ready client bundle targeting the staging API:
```bash
npm run build:mobile
```

### Step 2: Sync Capacitor Android
Move the compiled Vite assets into the native Android application wrapper:
```bash
npx cap sync android
```

### Step 3: Open in Android Studio
Launch Android Studio to build, compile, and deploy the staging debug APK to a connected device:
```bash
npx cap open android
```
*Note: Android Studio comes bundled with JDK 21+ which automatically resolves Java compilation specifications for Capacitor 6/8.*

---

## 3. Staging Backend API Readiness Audit

The staging environment connects to the following backend routing endpoints. Below is the readiness audit of the REST API services:

| Service / Endpoint | Route Path | Implementation Status |
| :--- | :--- | :---: |
| **Health Check** | `GET /health` | **`Ready`** |
| **Registration** | `POST /api/shared/auth/register` | **`Ready`** |
| **Authentication** | `POST /api/shared/auth/login` | **`Ready`** |
| **Profile** | `GET /api/shared/auth/me` | **`Ready`** |
| **Home Summary** | `GET /api/mobile/passenger/home` | **`Ready`** |
| **Payment Methods** | `GET /api/mobile/payment-methods` | **`Ready`** |
| **Active Cover Fetch** | `GET /api/mobile/cover/active` | **`Ready`** |
| **Cover Plans List** | `GET /api/mobile/cover/plans` | **`Ready`** |
| **Purchase Initiation** | `POST /api/mobile/cover/purchase` | **`Ready`** |
| **Payment Webhooks** | `POST /api/shared/webhooks/payment` | **`Ready`** |
| **QR Scan Verification** | `POST /api/mobile/qr/scan` | **`Ready`** |
| **Claims Creation** | `POST /api/mobile/claims` | **`Ready`** |
| **Claims Submission** | `POST /api/mobile/claims/:id/submit` | **`Ready`** |
| **Claims History List** | `GET /api/mobile/claims` | **`Ready`** |
| **Support Report** | `POST /api/mobile/support-reports` | **`Ready`** |
| **Multipart Evidence Upload**| `POST /api/mobile/claims/:id/documents`| **`Disabled (Metadata-Only)`** |

---

## 4. MVP Production Gate Decisions

Staging testers and product managers must align on these two critical features to finalize the MVP scope:

### A. Claims Evidence Upload
* **Current Status:** Document/photo upload is disabled because `SAFE_CLAIMS_UPLOAD_ENABLED=false` is enforced in the backend due to missing local bucket storage. The UI honestly displays: *"Document upload is not connected yet."*
* **MVP Decision Required:**
  1. **Exclude from MVP (Recommended):** Launch the app using only text-based accident narratives and police reference numbers (fully operational today).
  2. **Include in MVP:** Delay production launch until S3/local file storage and multipart controllers are fully implemented on the backend.

### B. Visa/Mastercard Payments
* **Current Status:** Card payments are disabled/hidden as `cardPaymentsEnabled = false` is returned in capabilities. Payments rely on mobile wallets (Airtel Money, MTN MoMo, Zamtel) which are fully operational.
* **MVP Decision Required:**
  1. **Exclude from MVP (Recommended):** Launch the MVP exclusively with mobile wallet networks (standard and preferred in the Zambian transit commuter market).
  2. **Include in MVP:** Delay production launch until card processing webhooks and PCI-compliant inputs are integrated.

---

## 5. Staging QA Checklist

Staging testers must run the following verification checklist on the physical phone:

* [ ] **Staging APK Installation:** App installs cleanly and overrides dev versions without icon/name discrepancies.
* [ ] **API Endpoint Inspection:** Settings/Environment details correctly point to `https://api.staging.safe.co.zm`.
* [ ] **Commuter Sign-up/Login:** Register a new commuter mobile wallet phone number successfully over the network.
* [ ] **Empty Cover State:** Renders the branded `no_active_cover_clean.png` image with a clear Get Cover CTA button.
* [ ] **Cover Purchase (Mobile Money):** Select a plan, select a mobile money wallet, initiate a purchase, and confirm that the payment status shifts correctly through selected, processing, pending, and succeeded.
* [ ] **Timer Countdown:** The cover ticks down in real-time, survives phone lock/sleep/navigation, and terminates cleanly at `00:00:00` without negative ticks.
* [ ] **Sticker QR Verification:** Scan or enter a manual valid sticker code. Confirm it displays the successful verified card (`verified_vehicle_clean.png`) with route, registration, and a prominent **"Start trip tracking"** CTA.
* [ ] **Scanner Error Handling:** Check corrupt codes (renders full error card) and network drops (renders inline warning banner retaining input text).
* [ ] **Mapping Fallbacks:** Leaflet tiles load correctly. Turning off geolocation displays the honest location needed fallback.
* [ ] **Claims Submission:** Verify that standard claims narrative submits cleanly, and the evidence upload page correctly displays the disabled state message.
* [ ] **Support Interface:** Confirm the chat Composer allows sending async support requests, displaying a clear confirmation prompt upon completion.
* [ ] **Navigation Stability:** Tap through `Home`, `Cover`, `Verify`, `Claims`, and `Profile` to ensure zero layout jump or cut-off labels.
