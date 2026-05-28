# SAFE Backend — Staging Deployment Blueprint & Operations Guide

This guide details the step-by-step staging backend deployment, DNS mapping, HTTPS reverse proxy configuration, SQLite database migration, and security auditing for:
`https://api.staging.safe.co.zm`

---

## 1. Environment & Startup Configuration

The backend Express application (`apps/backend/src/index.ts`) listens on the port specified by the `PORT` environment variable (default: `8080`) and binds to `0.0.0.0` (all adapters), making it fully ready to receive proxied HTTPS traffic.

### Required Environment Variables (`.env.staging.example`)
Ensure the staging environment secrets manager (or VPS host `.env` file) is populated with the following keys:
*   `SAFE_APP_ENV=staging`
*   `DATABASE_URL="file:/var/safe/staging.db"` (persistent path outside of ephemeral server build paths)
*   `PORT=8080`
*   `JWT_SECRET="REPLACE_WITH_STRONG_RANDOM_SECRET"` (long cryptographically secure string)
*   `CORS_ORIGINS="https://app.staging.safe.co.zm"` (allows CORS handshakes from the webview/emulator origin)
*   `SAFE_QR_PUBLIC_BASE_URL="https://app.staging.safe.co.zm"`
*   `SAFE_SUPPORT_PHONE="+260977300001"` (staging support hotline)
*   `SAFE_SUPPORT_EMAIL="support@staging.safe.co.zm"`

---

## 2. Staging Deployment Blueprint (Render / Railway / VPS)

### Option A: Railway (Recommended)
1. **Create Project:** Sign in to Railway and click "New Project" -> "Deploy from GitHub repo" -> Select `Megamind33-tech/SAFE`.
2. **Configure Root Directory:** Set the build root directory to `apps/backend`.
3. **Configure Environment Variables:** Add all staging environment variables listed in `.env.staging.example`.
4. **Deploy:** Railway will automatically run `npm run build` and launch via `npm run start` (Express listening on `PORT` assigned dynamically).

### Option B: VPS with Nginx Reverse Proxy (DigitalOcean Droplet)
1. **Initialize Directory & Node:** Clone the repo, install Node.js (20+), and build dependencies:
   ```bash
   npm install --workspace apps/backend
   npm --workspace apps/backend run build
   ```
2. **Configure PM2 Process Manager:** Keep the backend active in the background:
   ```bash
   npm install -g pm2
   cd apps/backend
   pm2 start dist/index.js --name "safe-backend-staging" --env PORT=8080
   pm2 save
   pm2 startup
   ```

---

## 3. DNS Configuration

To map `api.staging.safe.co.zm` to your deployed staging host, set up the following records in your DNS management console (e.g. Cloudflare, Route53, or Namecheap):

| Record Type | Host / Name | Target / Value | TTL |
| :--- | :--- | :--- | :--- |
| **A Record** (Direct IP) | `api.staging` | `142.250.180.14` *(Workstation/Droplet Public IP)* | `Auto / 3600` |
| **CNAME** (Platform target) | `api.staging` | `safe-backend.up.railway.app` *(Railway Domain)* | `Auto / 3600` |

### DNS Propagation Verification
Verify DNS resolution from your terminal using:
```bash
nslookup api.staging.safe.co.zm
```

---

## 4. HTTPS & Nginx Reverse Proxy (Certbot)

Staging requires secure SSL/TLS connections (`https`). If utilizing a VPS Droplet, configure Nginx to proxy secure connections:

### Step 1: Create Nginx Site Configuration
Create `/etc/nginx/sites-available/api.staging.safe.co.zm`:
```nginx
server {
    listen 80;
    server_name api.staging.safe.co.zm;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable the site:
```bash
ln -s /etc/nginx/sites-available/api.staging.safe.co.zm /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 2: Install Certbot SSL Certificate
Run Certbot to fetch Let's Encrypt certificates and auto-configure HTTP-to-HTTPS redirection:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.staging.safe.co.zm
```

---

## 5. Staging Database Mappings & Seeds

Initialize the staging SQLite database outside the ephemeral folder paths (`DATABASE_URL="file:/var/safe/staging.db"`):

### Step 1: Execute Prisma Migrations
Deploy Prisma database schemas to staging:
```bash
npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
```

### Step 2: Seed Staging Mock Commuters
Seed staging users, plans, and sticker codes safely:
```bash
npx tsx apps/backend/src/seed.ts
```

### Step 3: Seed Staging Admin
Create a secure staging administrator manually:
```bash
node apps/backend/scripts/createStagingAdmin.mjs
```
