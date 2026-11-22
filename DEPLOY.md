# Munim AI - Production Deployment Guide (Vercel & Supabase)

This guide documents the complete, step-by-step procedure for deploying **Munim AI** to [Vercel](https://vercel.com) with [Supabase](https://supabase.com) backend services, verifying clean SPA routing, PWA service worker isolation for `/pay`, and secure serverless OCR execution without client-side API key leakage.

---

## 1. Environment Variables Reference

Every environment variable utilized by Munim AI is categorized below.

> [!IMPORTANT]
> **Strict Secret Invariant**:
> - Variables prefixed with `VITE_` are **PUBLIC** and will be baked into the client JavaScript bundle sent to browser users.
> - Variables without `VITE_` are **STRICTLY PRIVATE SECRETS** and are only accessible inside Vercel Serverless Functions (`/api/*`) or Supabase Edge Functions.
> - **No secret key ever uses a `VITE_` prefix.**

### Public Client Variables (Safe in Browser)

| Variable Name | Required | Default / Example | Purpose / Description |
| :--- | :---: | :--- | :--- |
| `VITE_SUPABASE_URL` | **Yes** | `https://xyzcompany.supabase.co` | Supabase project API gateway endpoint. Safe for public browser usage. |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | `eyJhbGciOi...` | Supabase public anonymous API key. Protected by Postgres Row Level Security (RLS). |
| `VITE_STT_PROVIDER` | No | `browser` | Speech-to-Text provider engine. `'browser'` uses the Web Speech API (zero cost). |
| `VITE_DEMO_MODE` | No | `false` (prod) / `true` (demo) | When `'true'`, enables offline seed data (8 customers, 12 items). In production, set to `false`. |
| `VITE_DEFAULT_LANGUAGE` | No | `hi` | Initial interface language code (e.g. `hi`, `en`, `pa`, `gu`, `mr`, `ta`, etc.). |
| `VITE_CURRENCY_SYMBOL` | No | `₹` | Currency symbol used across ledger and pricing displays. |
| `VITE_PAYMENT_PAGE_BASE_URL` | Recommended | `munim-ai.vercel.app` | Domain for customer payment links in WhatsApp/SMS reminders. If unset, reminders fall back to plain-text UPI details only. |
| `VITE_ENABLE_MOCK_BILL_SCAN` | No | `false` | When `'true'`, allows mock items fallback if OCR server function is offline or unconfigured. |

### Server-Side Secrets (Never Exposed to Client)

| Variable Name | Required | Default / Example | Purpose / Description |
| :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | **Yes** (for OCR) | `AIzaSy...` | Google Gemini API key used **exclusively** on the server by `/api/bill-scan`. **Never bundled in client.** |
| `BILL_SCAN_DAILY_CAP` | No | `20` | Maximum bill scans allowed per store per calendar day in `/api/bill-scan` to prevent quota abuse. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | `eyJhbGciOi...` | Supabase admin key (bypasses RLS). Used only in server migrations or edge webhooks. |
| `SARVAM_API_KEY` | Optional | `sk_...` | Optional Sarvam AI key if deploying custom server STT proxy functions. |
| `SMS_GATEWAY_API_KEY` | Optional | `...` | Optional key for automated SMS/WhatsApp webhook dispatchers. |

---

## 2. Supabase Backend Setup

### Step 2.1: Run Database Migrations
1. In the Supabase Dashboard, navigate to **SQL Editor**.
2. Execute the migrations located in:
   - `supabase/migrations/20261120000000_reminder_settings.sql`
3. Verify that the tables `shops`, `customers`, `items`, `transactions`, `suppliers`, and `reminders` have **Row Level Security (RLS) enabled** and policies attached.

### Step 2.2: Configure Allowed Authentication & Redirect URLs
In the Supabase Dashboard, navigate to **Authentication** $\to$ **URL Configuration**:

1. **Site URL**:
   Set this to your canonical production URL:
   ```text
   https://<your-project>.vercel.app
   ```
   *(Or your custom domain, e.g., `https://munimai.in`)*

2. **Redirect URLs / Allowed Callback URLs**:
   Add wildcards for preview branches, custom domains, and local development:
   ```text
   https://<your-project>.vercel.app/**
   https://*.vercel.app/**
   https://<your-custom-domain>/**
   http://localhost:5173/**
   ```

### Step 2.3: Storage Buckets
Under **Storage**, ensure the following buckets exist (or are created with authenticated upload & public read):
- `proofs` (for voice audio proof clips)
- `bill-photos` (for bill invoice image snapshots)

---

## 3. Vercel Deployment Steps

### Method A: Git Integration (Recommended)
1. Push your repository to GitHub / GitLab / Bitbucket.
2. In the [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** $\to$ **Project**.
3. Import your repository (`MunimAI`).
4. **Configure Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. **Add Environment Variables**:
   Under **Environment Variables**, add the variables from Section 1:
   - `VITE_SUPABASE_URL` = `https://<your-id>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<your-anon-key>`
   - `VITE_PAYMENT_PAGE_BASE_URL` = `<your-project>.vercel.app`
   - `VITE_DEMO_MODE` = `false`
   - `GEMINI_API_KEY` = `<your-gemini-key>` *(Set for Production, Preview, and Development environments)*
   - `BILL_SCAN_DAILY_CAP` = `20`
6. Click **Deploy**.

### Method B: Vercel CLI
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Link and deploy
vercel

# 3. Add secrets to Vercel
vercel env add GEMINI_API_KEY production
vercel env add BILL_SCAN_DAILY_CAP production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_PAYMENT_PAGE_BASE_URL production

# 4. Trigger production build
vercel --prod
```

---

## 4. Architecture & Routing Safeguards

### 4.1 SPA Rewrites (`vercel.json`)
The application uses client-side routing for `/`, `/stock`, `/ledger`, `/today`. To ensure browser refreshes do not 404 while protecting `/pay` and `/api/*`:
- [vercel.json](file:///C:/Users/Croma/Desktop/DukaanAI/vercel.json) rewrites all non-static paths to `/index.html` using a negative lookahead regex:
  ```json
  {
    "cleanUrls": true,
    "rewrites": [
      {
        "source": "/((?!pay|api|assets|favicon\\.ico|apple-touch-icon\\.png|pwa-|sw\\.js|workbox-|manifest\\.webmanifest|registerSW\\.js).*)",
        "destination": "/index.html"
      }
    ]
  }
  ```
- **Why this matters**:
  - `/pay?pa=...` loads `public/pay/index.html` directly as a fast, unauthenticated, static page.
  - `/api/bill-scan` invokes the serverless Node.js function.
  - `/stock`, `/ledger`, `/today` resolve to `/index.html` without 404 errors.

### 4.2 Service Worker & PWA Isolation (`vite.config.mjs`)
To ensure customer payment links are never intercepted by the shopkeeper app shell:
- `workbox.navigateFallbackDenylist` contains `[/^\/pay(\/.*)?$/, /^\/api(\/.*)?$/]`.
- `workbox.globIgnores` excludes `**/pay/**` from being precached.
- Customers opening `https://munim-ai.vercel.app/pay?...` on their phone get the static payment UI instantly without downloading the 1.4 MB main application bundle.

### 4.3 Secure Bill OCR Serverless Function (`api/bill-scan.ts`)
- Ingests uploaded image base64 and validates MIME types.
- Enforces an in-memory per-shop daily quota (default: 20 scans per shop per day).
- When a shop exceeds 20 scans, returns HTTP 429 (`Daily bill scan quota exceeded`).
- Communicates directly with Google Gemini 2.0 Flash on the server side.
- **Client bundle never contains `GEMINI_API_KEY`.**

---

## 5. Post-Deployment Verification Checklist

Run through these 10 tests immediately after deploying to verify system integrity:

- [ ] **1. HTTPS Root Loading**: Open `https://<your-project>.vercel.app`. Verify the landing/login screen renders cleanly over HTTPS with zero console errors.
- [ ] **2. Client-Side Routing**: Click between *Today*, *Ledger*, and *Stock*. Press browser **Refresh (F5)** while on `/stock`. Verify the page reloads properly and does not display Vercel 404.
- [ ] **3. Static Payment Route**: Open `https://<your-project>.vercel.app/pay?pa=test@upi&pn=Sharma+Store&am=500&lang=hi`. Verify:
  - The static payment page renders with *"Sharma Store"*, *"₹500"*, and *"test@upi"*.
  - The main app shell is NOT loaded.
  - The "Copy UPI ID" and "Pay with UPI app" buttons are displayed and functional.
- [ ] **4. Service Worker Registration**: Open DevTools $\to$ Application $\to$ Service Workers. Verify `sw.js` is registered and active. Inspect the Cache Storage to ensure `pay/index.html` is **not** present in the precache manifest.
- [ ] **5. Zero Secret Exposure**: Open DevTools $\to$ Sources / Network. Search client assets for your Gemini API key or `VITE_GEMINI_API_KEY`. Confirm **0 matches**.
- [ ] **6. Supabase Authentication**: Log into the shopkeeper account. Verify the session token persists in local storage across page refreshes.
- [ ] **7. Voice Commands & STT**: Tap the microphone icon. Say *"Doodh 2 litre 120 rupaye bikri"*. Verify the confirmation card pops up with the correct amount and items.
- [ ] **8. Bill Photo OCR**: Open Bill Scan $\to$ upload a test receipt photo. In DevTools Network tab, observe the POST request to `/api/bill-scan`. Confirm it returns HTTP 200 with extracted items, and verify that no client call goes directly to `generativelanguage.googleapis.com`.
- [ ] **9. Bill OCR Daily Cap**: Verify that exceeding the daily cap returns HTTP 429 with an in-app error toast and does not crash the client.
- [ ] **10. Payment Reminder Formatting**: In Ledger $\to$ Reminders, generate a payment message preview. Confirm:
  - Amount is formatted with Indian digit grouping (`₹20,500`).
  - Contains plain-text UPI ID and payee name.
  - Contains `https://<VITE_PAYMENT_PAGE_BASE_URL>/pay?...` on its own line.
  - Contains **no raw `upi://` deep link** in the message text.
