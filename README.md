# Munim AI 🎙️📦

> **Munim AI** is a voice-first business assistant and ledger for Indian kirana shopkeepers. Designed as a production-quality, installable, mobile-first Progressive Web App (PWA) with multi-language support (Hindi, Punjabi, Hinglish).

---

## 🌟 Key Features

- **Voice-First Kirana Interaction**: Speak in Hindi, Punjabi, or Hinglish ("Aaj 5 kilo chini bechi", "Ramesh ko 500 ka udhaar").
- **Smart Disambiguation**: Intelligently handles common names ("Kaunsa Ramesh? - Ramesh Sharma, Gali 4 vs Ramesh Kumar, near temple").
- **Voice Proof of Udhaar**: Consent notice + 5-second audio clip recording of customer agreement ("Haan, 500 mere naam likh do"), stored with playback in Ledger.
- **Safety & Strict Two-Step Confirmation**: No transaction is saved silently. Always reads back amounts in words and digits; saves only after "Haan" or tap. "Wapas karo" undoes the last entry.
- **High Contrast Kirana UI**:
  - Forest Green (`#0B6E4F`), Saffron Accent (`#F5A524`), Warm Background (`#FAF7F2`).
  - Money owed is strictly Red (`#D64545`), Money received is strictly Green (`#1E9E5A`).
  - 64px tap targets in the thumb zone for easy single-hand shop use.
- **14-Day Stock Prediction**: Run-rate analysis computing average daily sales and days of stock left with automatic low-stock alerts.
- **Multi-Tenant Supabase Postgres & Row-Level Security (RLS)**: Strictly isolates each shop's data; verified with automated unit tests.
- **Offline-Ready PWA**: Service worker offline app shell caching and local state persistence.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion
- **PWA**: `vite-plugin-pwa`, Workbox offline caching, Web App Manifest
- **Backend & Database**: Supabase Postgres with Row Level Security (RLS)
- **Voice & Audio**: Web Speech API (`hi-IN`, `en-IN`), pluggable Server STT, Web Audio haptics and feedback cues
- **Testing**: Vitest unit test suite

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Puranjaysalaria/MunimAI.git
cd MunimAI
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Unit Tests
```bash
npm run test
```

### 5. Build Production PWA
```bash
npm run build
```

---

## 📁 Project Structure

```
DukaanAI/
├── public/                 # Favicon, PWA manifest icons
├── src/
│   ├── components/         # Navigation, Header, BottomTabBar, Modals
│   ├── context/            # ShopContext (state, local storage, undo logic)
│   ├── data/               # Demo seed data (8 customers, 12 items, 14 days txs)
│   ├── i18n/               # Multi-language translations (Hindi, Punjabi, English)
│   ├── lib/                # Utils, Sound/Haptics, Supabase client
│   ├── pages/              # Home, Ledger, Stock, Today, Auth, PinLock
│   ├── types/              # Database schema & intent types
│   ├── App.tsx             # Root app orchestration
│   └── main.tsx            # Entry point
├── supabase/
│   ├── migrations/         # 20261118000000_initial_schema.sql (RLS policies)
│   └── seed.sql            # Demo shop seed SQL
├── tests/
│   └── rls.test.ts         # Multi-tenant RLS isolation tests
├── DECISIONS.md            # Architecture Decision Records (ADRs)
└── vite.config.mjs         # Vite & PWA configuration
```

---

## 🔒 Security & Row Level Security (RLS)

All tables (`customers`, `items`, `transactions`, `stock_movements`, `suppliers`, `reminders`) enforce shop-level RLS using `public.auth_shop_id()`. Verified via automated tests in `tests/rls.test.ts`.

---

## 📜 License
MIT License
