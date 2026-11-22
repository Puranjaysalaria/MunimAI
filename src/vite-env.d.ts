/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_STT_PROVIDER?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_DEFAULT_LANGUAGE?: string;
  readonly VITE_CURRENCY_SYMBOL?: string;
  readonly VITE_PAYMENT_PAGE_BASE_URL?: string;
  readonly VITE_ENABLE_MOCK_BILL_SCAN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
