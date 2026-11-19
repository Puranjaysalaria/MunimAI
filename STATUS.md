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
- [ ] **Step 3: Reminder Settings Modal (`src/components/Reminders/ReminderSettingsModal.tsx`)**
  - Threshold chips & custom input
  - Tone selector with live message preview
  - WhatsApp first, SMS fallback selector
  - Quiet hours configuration
  - Clear text stating schedules only create review prompts and never auto-send
- [ ] **Step 4: Integration into Modals & Context**
  - Settings gear icon in `RecoveryModal.tsx` header
  - Section in `SettingsModal.tsx`
  - Safety rules in `RecoveryModal.tsx` (daily cap, quiet hours warning, VIP/do-not-remind badges)
  - State persistence in `ShopContext.tsx`
- [ ] **Step 5: Voice Intent & Parser**
  - Voice triggers in `ruleParser.ts`: "Reminder settings kholo", etc.
  - Action handler in `useVoiceController.ts`
- [ ] **Step 6: Translations (i18n)**
  - Localization across all 10 language files
- [ ] **Step 7: Supabase Migration**
  - SQL migration script for schema updates
