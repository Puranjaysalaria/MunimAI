# Munim AI - Architecture & Design Decisions (DECISIONS.md)

This log records major technical and product decisions made during the development of Munim AI.

---

### DECISION-001: Mobile-First Kirana PWA & UX Paradigm
- **Date**: 2026-11-18
- **Context**: Kirana shopkeepers (aged 35–65) work in bright, noisy environments, frequently with only one hand free and oily/flour-covered fingers. Fast, tactile, voice-driven interaction is paramount.
- **Decision**:
  - Minimum tap target is **64px** across all key buttons.
  - Primary mic button sits directly in the bottom-center thumb zone.
  - Saffron `#F5A524` accent for mic button with high contrast against the `#0B6E4F` header and `#FAF7F2` warm background.
  - Currency numbers rendered at 32px or higher.
  - Full PWA support with service worker offline precaching and installability.

---

### DECISION-002: Color Token & Meaning Policy
- **Date**: 2026-11-18
- **Context**: Shopkeepers must instantly understand financial state without reading small text.
- **Decision**:
  - Primary: `#0B6E4F` (Forest/Kirana Green)
  - Accent: `#F5A524` (Saffron Gold)
  - Background: `#FAF7F2` (Warm, non-glare Kirana paper background)
  - Surface: `#FFFFFF`
  - Text: `#1B1B1B` (High contrast, WCAG AA compliant)
  - Muted: `#5B5B5B`
  - Owed (Udhaar): `#D64545` (Strictly red for money owed by customers)
  - Received (Jama): `#1E9E5A` (Strictly green for money collected/received)
  - Listening: `#2563EB` (Blue pulsing state for active microphone)

---

### DECISION-003: Dual-Engine STT Architecture
- **Date**: 2026-11-18
- **Context**: Web Speech API is zero-cost, runs on-device, and provides fast live transcripts for `hi-IN` and `en-IN`, but lacks consistency across older devices or noisy environments. Pluggable server STT (Sarvam, Whisper, Google Cloud Speech) handles complex accents and noise.
- **Decision**:
  - Implement a common `STTProvider` interface under `src/stt/`.
  - Default to `browserSpeechProvider` for local dev and offline capability.
  - Provide `serverSpeechProvider` via Supabase Edge Function `stt-proxy` controlled by `VITE_STT_PROVIDER`.
  - Auto-fallback to browser STT if server STT times out or fails.

---

### DECISION-004: Dual-Engine Speech Parsing (Edge LLM + Offline Rule-Based)
- **Date**: 2026-11-18
- **Context**: Kirana shops frequently have intermittent 4G/3G connectivity. Voice parsing must work instantly both online and offline.
- **Decision**:
  - Online path calls Supabase Edge Function `parse-voice` which queries an LLM with strict Zod JSON output `{intent, customer, amount, item, quantity, language, confidence}`.
  - Offline/fallback path executes an in-browser deterministic rule-based parser (`src/parser/ruleParser.ts`) with a rich synonym table (e.g., chini/cheeni/sugar, doodh/milk, aata/atta/flour) and multilingual number converter (pachaas, 50, paanch sau, 500, dhai sau).
  - Both engines adhere strictly to: never silently guess amounts or customers. If confidence < 0.7 or fields missing, prompt for clarification.

---

### DECISION-005: Safety & Two-Step Confirmation Rule
- **Date**: 2026-11-18
- **Context**: In financial ledgers, accidental saves cause severe trust erosion.
- **Decision**:
  - No transaction is ever saved silently or immediately after speech recognition.
  - A bottom slide-up confirmation card always appears displaying amount (>=32px), customer name, items, and action.
  - Spoken confirmation reads back amount in words and digits.
  - Save occurs ONLY upon user pressing "Haan" or speaking "Haan". "Nahi" or "ruko" cancels immediately. "Wapas karo" undoes the last committed transaction.

---

### DECISION-006: Customer Audio Proof & Storage Strategy
- **Date**: 2026-11-18
- **Context**: Shopkeepers often face disputes when customers claim they never took udhaar.
- **Decision**:
  - Customer proof audio is isolated from shopkeeper speech.
  - Clear on-screen consent prompt shown before recording: *"Customer se bulwayein: 'Haan, 500 mere naam likh do' "*.
  - 5-second fixed recording via `MediaRecorder`.
  - Saved to private Supabase Storage bucket `proof-clips`, accessible via signed URLs with shop-level RLS.
  - Offline entries queue audio in IndexedDB until internet is restored.

---

### DECISION-007: Multi-Tenant RLS & Offline Synchronization
- **Date**: 2026-11-18
- **Context**: Shop data privacy is non-negotiable. Every shop must be strictly isolated.
- **Decision**:
  - Every database table (`customers`, `items`, `transactions`, `stock_movements`, `suppliers`, `supplier_orders`, `reminders`) includes `shop_id UUID NOT NULL REFERENCES shops(id)`.
  - Supabase Postgres Row-Level Security (RLS) policies enforce that authenticated users can only view and mutate records where `shop_id` matches their own registered shop.
  - Client implements local IndexedDB queue for offline mutations, stamped with ISO timestamp, resolving conflicts by client action sequence and server reconciliation.

---

### DECISION-008: Zero-Friction Demo Mode & Local State First
- **Date**: 2026-11-18
- **Context**: Kirana shopkeepers, testers, and reviewers need immediate tactile access without forced cloud setup blockers.
- **Decision**:
  - Pre-load demo shop ('Sharma Kirana Store') with the exact 8 specified customers (including Ramesh Sharma at Gali 4 and Ramesh Kumar near Temple), 12 staple grocery items, 14 days of realistic transactions, and 2 suppliers.
  - 1-tap "Open Demo Shop" button on login screen allows instant hands-on verification of all ledger, stock, and today features.
  - 4-digit PIN default set to `1234` for rapid lock/unlock testing.

---

### DECISION-009: Hindi Verb Disambiguation for Number Parsing ('Likh do' vs Digit 2)
- **Date**: 2026-11-18
- **Context**: In colloquial Hindi and Punjabi, phrases like "likh do", "kar do", "bhej do", and "de do" use the auxiliary verb "do" (meaning "please write / do / send / give"), which collided with the numeral "do" (2).
- **Decision**:
  - The number parser normalizes verb stems followed by "do" (e.g. `likh do`, `kar do`, `bhej do`, `mod do`) as actions rather than numerals, ensuring accurate intent detection for "Haan likh do" without accidental extraction of amount `₹2`.

---

### DECISION-010: Chronological Multi-Item Extraction in Kirana Natural Language
- **Date**: 2026-11-18
- **Context**: Shopkeepers often speak multiple items in a single sentence ("Chawal aur aata becha").
- **Decision**:
  - `findMentionedItems` sorts recognized synonyms strictly by their text position index rather than registry array order, accurately preserving the primary item spoken.

---

### DECISION-011: Strict Two-Stage Confirmation Card Architecture & Voice Readback
- **Date**: 2026-11-18
- **Context**: Every voice command must be verified before mutating the shop's financial state.
- **Decision**:
  - The `ConfirmationCard` component slides up from the bottom with 64px tap targets for "Haan (लिख दो)" and "Nahi (रद्द)".
  - On mount, `SpeechSynthesizer` speaks the readback in the shopkeeper's selected language, voicing both digits and words (e.g. *"Ramesh Sharma, पाँच सौ (500) रुपये उधार। लिख दूँ?"*).
  - Both buttons respond to tap and continuous voice detection ("Haan" saves, "Nahi" cancels).

---

### DECISION-012: In-Memory Undo Stack with Immediate Balance & Inventory Rollback
- **Date**: 2026-11-18
- **Context**: If a shopkeeper confirms an entry by mistake, they must be able to cancel it immediately without manual ledger editing.
- **Decision**:
  - On confirming any transaction, an `UndoToast` banner appears with a direct "वापस करो (Undo)" button.
  - Speaking "Wapas karo" or tapping Undo instantly reverses the transaction:
    - Restores the customer's previous `balance_owed`.
    - Restores deducted inventory quantities.
    - Plays audio confirmation cue: *"₹500 का लेन-देन वापस कर दिया गया है"*.

---

### DECISION-013: Customer Audio Proof Recording & Dual-Tier Storage
- **Date**: 2026-11-18
- **Context**: Udhaar disputes are the #1 source of bad debt and damaged relationships for Indian kirana shopkeepers. A recorded voice confirmation from the customer (*"हाँ, 500 मेरे नाम लिख दो"*) provides indisputable proof.
- **Decision**:
  - Isolate customer proof recording as an explicit, deliberate step triggered after an udhaar transaction is confirmed ("Customer se bulwayein").
  - Enforce clear on-screen legal consent before recording starts.
  - Fixed 5-second `MediaRecorder` capture with real-time countdown timer.
  - Dual-tier storage strategy (`src/storage/proofStorage.ts`):
    1. Immediately cache the audio blob in local IndexedDB (`proofClips` store via `idb`) so it is instantly playable even without internet.
    2. Upload asynchronously to Supabase private storage bucket `proof-clips` under the path `{shop_id}/{transaction_id}.webm`.
    3. Generate short-lived signed URLs for playback when fetched from cloud.
  - Shopkeeper retains full compliance control with a right-to-delete button on any recorded clip in the Ledger.

---

### DECISION-014: 14-Day Sales Velocity & Stock Depletion Prediction
- **Date**: 2026-11-18
- **Context**: Kirana shopkeepers frequently stock out of fast-moving staples (milk, sugar, bread) because they rely on visual inspection of shelves rather than run-rate math.
- **Decision**:
  - Calculate 14-day item sales velocity dynamically: $\text{daily\_avg} = \frac{\sum \text{quantities sold in past 14 days}}{14}$.
  - Compute days of stock remaining: $\text{days\_left} = \frac{\text{current\_stock}}{\text{daily\_avg}}$.
  - Critical threshold flagged when $\text{days\_left} < 2$ days (e.g. Milk at 0.7 days).
  - Natural spoken response dynamically formulated with localized Indic names (दूध, ਖੰਡ, ਆਟਾ) and days remaining.

---

### DECISION-015: Supplier Order Partitioning & 1-Tap Messaging Dispatch
- **Date**: 2026-11-18
- **Context**: Indian shopkeepers deal with distinct suppliers for grain wholesale vs packaged FMCG/dairy. Placing weekly orders manually is error-prone and time-consuming.
- **Decision**:
  - Automatically partition low-stock items by supplier (`Aggarwal Grain Wholesale Mandi` for grains/pulses/sugar vs `Gupta Dairy & FMCG` for dairy/oil/packaged goods).
  - Auto-calculate 7-day target replenishment buffer quantities.
  - Support instant dispatch via WhatsApp deep links (`https://wa.me/...`) and SMS (`sms:...`) with clean, formatted grocery order slips.

---

### DECISION-016: Spoken Daily Summary & Net Profit Estimation
- **Date**: 2026-11-18
- **Context**: At shop closing, shopkeepers want to know how much they earned today without calculating by hand.
- **Decision**:
  - Voice query *"Aaj kitni kamai hui?"* or Today screen button computes today's total sales, new credit given, cash collected on old debts, and shop expenses.
  - Computes estimated net profit based on standard ~15% Kirana gross margin minus expenses.
  - Generates natural, continuous speech readout in Hindi, Punjabi, or English, alongside a 4-box financial summary sheet.

---

### DECISION-017: NPCI-Compliant UPI Deep-Links in Debt Recovery
- **Date**: 2026-11-18
- **Context**: Kirana customers delay paying udhaar because they need to visit the shop in person with cash. Providing a direct UPI payment link dramatically speeds up cash recovery.
- **Decision**:
  - Embed standard NPCI deep links (`upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR&tn={note}`) into every reminder.
  - Clicking the link on customer's phone directly launches Google Pay, PhonePe, Paytm, or BHIM with amount and shop VPA pre-filled.
  - Keep VPA unescaped (`pa=user@bank`) to avoid parsing errors across diverse Indian payment apps.

---

### DECISION-018: Multilingual Polite Reminder Generation in Customer's Preferred Tongue
- **Date**: 2026-11-18
- **Context**: Harsh or rude debt reminders destroy neighbourly relations in Indian communities. Reminders must be respectful, polite, and in the customer's native language.
- **Decision**:
  - Formulate respectful reminder copy with *"जी"* honorifics tailored to each customer's `preferred_language` (`hi`, `pa`, `en`).
  - Voice trigger *"Jinka 1000 se zyada baaki hai unko yaad dilao"* filters customers by threshold and displays editable reminder cards.
  - Reminders send only after explicit shopkeeper voice confirmation (*"Bhej do"*) or 1-tap dispatch.

---

### DECISION-019: Dual-Layer Offline Mutation Queue & Timestamp Reconciliation
- **Date**: 2026-11-18
- **Context**: Kirana shops often operate in underground basements or areas with intermittent 3G/4G connectivity. Zero ledger entries may be lost while disconnected.
- **Decision**:
  - Implement an IndexedDB store `pendingMutations` using `idb` with an in-memory fallback for headless test runners.
  - When offline (`!navigator.onLine`), transactions are queued locally with ISO timestamps and marked `synced: false`.
  - Header displays a quiet cloud status: green check when synced (`सुरक्षित`), amber pulsing badge (`X सिंक बाकी`) when entries wait in queue.
  - When connection is restored (`window.online`), `syncEngine` drains the mutation queue, reconciles with Supabase, triggers haptic confirmation, and speaks an audio announcement.

---

### DECISION-020: Installable PWA & Offline App Shell
- **Date**: 2026-11-18
- **Context**: Shopkeepers want an app on their home screen without depending on Google Play Store updates.
- **Decision**:
  - Configure Vite PWA plugin with `generateSW` caching all scripts, stylesheets, and fonts in CacheStorage.
  - Present a tactile, saffron-accented install banner upon `beforeinstallprompt` (*"मुनीम AI को फोन में इंस्टॉल करें (बिना इंटरनेट भी चलेगा)"*).



