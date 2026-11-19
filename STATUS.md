# DukaanAI - Feature Implementation Status

## Feature: Reminder Settings (तगादा व उधारी रिमाइंडर सेटिंग्स)

### Implementation Roadmap
- [x] **Step 1: Data Types (`src/types/schema.ts`)**
  - Added `ReminderTone` ('polite' | 'standard' | 'firm')
  - Added `ReminderSchedule` ('manual' | 'weekly_sunday' | 'biweekly' | 'monthly_1st' | 'overdue_15d')
  - Added `ReminderChannel` ('whatsapp' | 'sms' | 'whatsapp_first_sms_fallback')
  - Added `ReminderSettings` with quiet hours, trust filtering, and link toggles
  - Extended `Customer` with `do_not_remind`, `reminder_tone_override`, `last_reminded_at`
  - Extended `Shop.settings` with `reminder_settings`
- [x] **Step 2: Message Formatter (`src/lib/reminderService.ts`) & Unit Tests (`tests/reminder.test.ts`)**
  - 10 Indian languages x 3 tones x 2 UPI variants (with/without) = 60 templates
  - Factual & respectful "Firm (दृढ़)" wording without threats/shaming
  - Quiet hours check helper (default 9 PM - 8 AM)
  - Daily cap check (1 reminder per customer per day)
  - VIP / high-trust exemption check (customers with no score never exempt)
  - Comprehensive unit test suite (15 new tests, 106 tests total passing)
- [x] **Step 3: Reminder Settings Modal (`src/components/Reminders/ReminderSettingsModal.tsx`)**
  - Threshold chips & custom input (₹500, ₹1000, ₹2000, ₹5000 + custom)
  - Tone selector (Polite, Standard, Firm (दृढ़)) with live message preview
  - WhatsApp first, SMS fallback channel selector (never sends twice)
  - Quiet hours configuration (default 21:00 to 08:00)
  - VIP / High-trust exemption toggle (trust score >= 90; unrated customers never exempt)
  - UPI link toggle with display of existing shop UPI ID (no duplicate field)
  - Clear text stating schedules only create in-app review prompts and never auto-send
- [x] **Step 4: Integration into Modals & Context**
  - Settings gear icon in `RecoveryModal.tsx` header opening `ReminderSettingsModal`
  - Payment Reminders entry row in `SettingsModal.tsx`
  - Safety rules in `RecoveryModal.tsx`:
    - Daily cap badge & status ("Sent Today / आज भेजा गया")
    - Quiet hours active warning banner (21:00 - 08:00)
    - Per-customer tone override cycling directly on card
    - Per-customer "Don't Remind / तगादा रोकें" toggle
    - VIP high-trust regular badge (⭐ VIP 95)
    - Channel selector: "WhatsApp first, SMS fallback" (never sends twice)
  - ShopContext persistence & live Supabase sync via `updateCustomer` and `updateShopSettings`
- [x] **Step 5: Voice Intent & Parser**
  - Added `reminder_settings` intent to `ParsedIntent` and `ParsedIntentEnum`
  - Integrated Hindi ("तगादा सेटिंग्स खोलो"), Punjabi ("ਯਾਦ-ਪੱਤਰ ਸੈਟਿੰਗਾਂ"), and English ("reminder settings") voice triggers
  - Added Indic normalizer phrase mappings for reminder settings
  - Wired intent handler in `useVoiceController.ts` and `App.tsx`
  - Added unit tests in `tests/parser.test.ts` (109 tests total passing)
- [x] **Step 6: Translations (i18n)**
  - Localized across all 10 language files: Hindi (`hi`), English (`en`), Punjabi (`pa`), Gujarati (`gu`), Marathi (`mr`), Bengali (`bn`), Tamil (`ta`), Telugu (`te`), Kannada (`kn`), Malayalam (`ml`)
  - Added keys for reminder settings modal, sent today badge, do not remind badge, and quiet hours alert
  - Listed 7 languages needing native review (`gu`, `mr`, `bn`, `ta`, `te`, `kn`, `ml`)
- [ ] **Step 7: Supabase Migration**
  - SQL migration script for schema updates
