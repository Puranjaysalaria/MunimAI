# Munim AI 🎙️📦

> **Munim AI** is a voice-first business assistant and ledger (bahi-khata) built specifically for Indian kirana and neighbourhood shopkeepers (aged 35–65) operating on basic Android phones in bright, noisy environments. Designed as an installable, mobile-first Progressive Web App (PWA) with native Hindi, Punjabi, and Hinglish understanding.

[![Tests](https://img.shields.io/badge/tests-76%20passed-brightgreen.svg)]()
[![PWA](https://img.shields.io/badge/PWA-installable-orange.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()

---

## 🌟 Key Features

1. **Voice-First Tactile UX**:
   - Single-tap saffron microphone in the bottom thumb zone.
   - Live visual audio waveform, speech readback in words and digits.
   - Dual STT architecture: Browser Web Speech API default (`hi-IN`, `pa-IN`, `en-IN`) + pluggable server provider.
2. **Safety & Two-Step Confirmation**:
   - No transaction is ever saved silently.
   - Slide-up bottom card with 32px+ amounts, customer details, and 64px tap targets.
   - Saves only after voice *"Haan"* or button tap; *"Wapas karo"* instantly undoes the transaction.
3. **Smart Disambiguation ("Kaunsa Ramesh?")**:
   - If a name matches multiple customers, Munim AI prompts *"Kaunsa Ramesh?"* and displays both with addresses (e.g. *Ramesh Sharma, Gali 4* vs *Ramesh Kumar, Near Temple*).
4. **Indisputable Customer Voice Proof**:
   - 5-second customer consent audio recording (*"हाँ, 500 मेरे नाम लिख दो"*).
   - Dual-tier storage: cached in IndexedDB for offline playback, uploaded to private Supabase Storage with signed URLs and right-to-delete.
5. **14-Day Sales Velocity & Stock Depletion Prediction**:
   - Computes daily sales run rate dynamically over the past 14 days of transactions:
     $$\text{Daily Avg Sales} = \frac{\sum \text{quantities sold in past 14 days}}{14}, \quad \text{Days Left} = \frac{\text{Current Stock}}{\text{Daily Avg Sales}}$$
   - Flags critical stock when $\text{Days Left} < 2$ days (e.g. *Doodh* with 8L remaining at 12L/day velocity $= 0.7$ days).
   - Voice trigger: *"Doodh khatam hone wala hai?"* answers with days of stock left and restock advice.
6. **Supplier Order Partitioning & 1-Tap Dispatch**:
   - Voice trigger: *"Agle hafte ka samaan mangwana hai"* or Stock tab tap.
   - Automatically groups low-stock items by supplier (*Aggarwal Grain Mandi* for grains/sugar, *Gupta Dairy & FMCG* for dairy/packaged goods).
   - 1-tap WhatsApp (`https://wa.me/...`) and SMS (`sms:...`) dispatch with pre-formatted kirana purchase slips.
7. **Daily Financial Summary Voice Narration**:
   - Voice trigger: *"Aaj kitni kamai hui?"*
   - Computes total sales, new credit given, cash collected on old debts, shop expenses, and estimated net profit (15% grocery gross margin minus expenses).
   - Spoken audio narration and 4-quadrant summary card.
8. **Recovery Reminders with UPI Deep-Links**:
   - Voice trigger: *"Jinka 1000 se zyada baaki hai, unko yaad dilao"*.
   - Respectful reminders with *"जी"* honorifics in each customer's preferred language (`hi`, `pa`, `en`).
   - Embeds standard NPCI UPI payment deep links (`upi://pay?pa=...&pn=...&am=...&cu=INR`).
9. **Offline Mutation Queue & Auto-Sync**:
   - Full offline app shell via Vite PWA & Workbox.
   - Transactions recorded offline queue into IndexedDB `pendingMutations`.
   - Header cloud badge indicates sync state; auto-syncs when online with audio cue.
10. **Kirana Business Safeguards & Staff Role**:
    - Customer trust score (0 - 100) and credit-limit breach warnings.
    - Staff mode hides commercial cost prices and net profit margins (`••••••`).
    - 1-tap Excel CSV export (UTF-8 BOM) and printable authentic Bahi-Khata ledger slips.

---

## 🎨 Kirana Design System & Color Tokens

Color carries strict semantic meaning to prevent mistakes in bright shop glare:

| Token | Hex | Usage |
| :--- | :--- | :--- |
| **Primary** | `#0B6E4F` | Forest / Kirana Green - trust, balance, stability |
| **Accent** | `#F5A524` | Saffron Gold - primary mic button, key highlights |
| **Background**| `#FAF7F2` | Warm paper white - non-glare sunlight readability |
| **Surface** | `#FFFFFF` | Card surfaces, modals |
| **Text** | `#1B1B1B` | High contrast, meets WCAG AAA on white |
| **Muted** | `#5B5B5B` | Secondary labels, meets WCAG AA contrast (4.5:1+) |
| **Owed** | `#D64545` | **Strictly Red** for Udhaar (money owed by customers) |
| **Received** | `#1E9E5A` | **Strictly Green** for Jama (money collected/received) |
| **Listening** | `#2563EB` | Active microphone pulsating ring |

- **Tap Targets**: Minimum **64px** on all primary action buttons.
- **Numbers**: Amounts rendered at **32px or 36px font-black**.
- **Scripts**: Noto Sans Devanagari, Noto Sans Gurmukhi, and Inter loaded with `font-display: swap`.

---

## 🗣️ Voice Test Phrases (Try Speaking or Typing)

| Flow | Spoken Phrase (Hindi / Punjabi / Hinglish) | Expected Result |
| :--- | :--- | :--- |
| **Cash Sale** | *"Aaj 5 kilo chini bechi"* | Parsed: Sale ₹220, item chini (5 kg). Slide-up card reads back: *"5 kilo chini, 220 रुपये नकद बिक्री। लिख दूँ?"* |
| **Udhaar (Credit)** | *"Ramesh Sharma ko 500 ka udhaar, aata aur chini"* | Parsed: Credit ₹500, customer Ramesh Sharma. Confirms and deducts stock. |
| **Disambiguation** | *"Ramesh ko 500 ka udhaar"* | Identifies ambiguity; asks *"Kaunsa Ramesh?"* and shows cards for *Ramesh Sharma (Gali 4)* and *Ramesh Kumar (Mandir ke paas)*. |
| **Payment Received** | *"Ramesh Sharma ne 200 diye"* | Parsed: Payment ₹200. Shows old balance ~~₹500~~ $\rightarrow$ new balance **₹300**. |
| **Voice Proof** | Tap *"Customer se bulwayein"* after credit | Records 5s audio clip of customer (*"हाँ, 500 मेरे नाम लिख दो"*); stores in Ledger with play button. |
| **Stock Check** | *"Doodh khatam hone wala hai?"* | Computes 14-day velocity and replies: *"दूध का स्टॉक कम है! सिर्फ 0.7 दिन (8 litre) बचा है। नया माल मंगवाएं।"* |
| **Supplier Order** | *"Agle hafte ka samaan mangwana hai"* | Builds draft orders for *Aggarwal Grain Mandi* & *Gupta Dairy* with 7-day suggested quantities. |
| **Daily Earnings** | *"Aaj kitni kamai hui?"* | Spoken voice summary of today's sales, udhaar, cash collected, and estimated profit. |
| **Recovery Reminders**| *"Jinka 1000 se zyada baaki hai, unko yaad dilao"* | Shows customers owing $\ge ₹1000$ with UPI deep link preview in their language. |
| **Confirmation** | *"Haan"* or *"Likh do"* | Confirms and commits the pending transaction. |
| **Cancellation** | *"Nahi"* or *"Ruko"* | Cancels the pending transaction without saving. |
| **Undo** | *"Wapas karo"* | Immediately rolls back the last transaction, restoring customer balance and inventory. |

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Install
```bash
git clone https://github.com/Puranjaysalaria/MunimAI.git
cd MunimAI
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
*(The app includes an offline zero-friction Demo Mode with Sharma Kirana Store pre-seeded with 8 customers, 12 grocery items, 14 days of transactions, and 2 suppliers).*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173). Tap **"डेमो दुकान खोलें (Open Demo Shop)"** to jump directly in.

### 4. Run Automated Test Suite
```bash
npm run test
```
Executes all 76 unit and integration tests across RLS isolation, Indic synonym matching, 14-day stock analytics, customer voice proof, and recovery reminders.

### 5. Production PWA Build
```bash
npm run build
```
Generates production bundle in `dist/` with Service Worker (`dist/sw.js`) and Workbox offline precaching.

---

## ☁️ Deployment Guide (Vercel + Supabase)

### Step 1: Set Up Supabase Project

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** and run the initial migration:
   - File: [`supabase/migrations/20261118000000_initial_schema.sql`](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/migrations/20261118000000_initial_schema.sql)
   - This sets up multi-tenant tables (`shops`, `customers`, `items`, `transactions`, `stock_movements`, `suppliers`, `supplier_orders`, `reminders`) and enforces shop-level Row Level Security (RLS).
3. (Optional) Run the demo seed script:
   - File: [`supabase/seed.sql`](file:///C:/Users/Croma/Desktop/DukaanAI/supabase/seed.sql)
4. Create a Private Storage Bucket for customer voice proof clips:
   - Name: `proof-clips`
   - Privacy: **Private** (Signed URLs only)
   - Add RLS policy: users can select/insert objects where folder name matches `auth.jwt() -> app_metadata -> shop_id`.

### Step 2: Deploy Frontend to Vercel

1. Push your repository to GitHub.
2. In [Vercel Dashboard](https://vercel.com), click **Add New Project** and select the `MunimAI` repository.
3. Set the build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Configure Environment Variables in Vercel:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_STT_PROVIDER=browser
   VITE_DEMO_MODE=false
   VITE_DEFAULT_LANGUAGE=hi
   ```
5. Click **Deploy**. Vercel will build the PWA and host it over HTTPS (required for Web Speech API and MediaRecorder).

---

## 🔒 Security & Multi-Tenant Data Isolation

- Every table has a `shop_id UUID NOT NULL REFERENCES shops(id)`.
- Supabase Postgres Row-Level Security (RLS) ensures one shop owner can **never** query or mutate another shop's ledger:
  ```sql
  CREATE POLICY "Shops can only access their own transactions"
  ON public.transactions FOR ALL
  USING (shop_id = public.auth_shop_id());
  ```
- Verified by automated multi-tenant isolation unit tests in [`tests/rls.test.ts`](file:///C:/Users/Croma/Desktop/DukaanAI/tests/rls.test.ts).

---

## 📖 Architecture Decision Records (ADRs)

All design, architectural, and safety decisions are comprehensively documented in [`DECISIONS.md`](file:///C:/Users/Croma/Desktop/DukaanAI/DECISIONS.md):
- `DECISION-001` to `DECISION-008`: Mobile-first UX, Color tokens, Dual STT, Dual Parser, Safety confirmations, Demo mode.
- `DECISION-009` to `DECISION-012`: Verb stem normalization ("likh do" vs digit 2), in-memory rollback stack.
- `DECISION-013`: Customer audio proof consent notice and dual-tier IndexedDB/Cloud storage.
- `DECISION-014` to `DECISION-016`: 14-day stock depletion velocity, automated supplier grouping, spoken daily summary.
- `DECISION-017` to `DECISION-020`: NPCI UPI deep links, multilingual polite reminders, offline mutation queue with auto-sync, PWA install prompt.
- `DECISION-021` to `DECISION-024`: Trust score calculation, festive seasonal predictions, Excel CSV export, staff role commercial margin masking.

---

## 📄 License
MIT License. Built with ❤️ for India's neighbourhood Kirana shopkeepers.
