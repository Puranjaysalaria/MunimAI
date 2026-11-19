export type TransactionType = 'sale' | 'credit' | 'payment' | 'expense';
export type CustomerLanguage = 'hi' | 'pa' | 'en' | 'mr' | 'bn' | 'gu' | 'ta' | 'te' | 'kn' | 'ml';
export type ItemUnit = 'kilo' | 'gram' | 'litre' | 'packet' | 'piece' | 'dabba' | 'bori';
export type UserRole = 'owner' | 'staff';

export type ReminderTone = 'polite' | 'standard' | 'firm';
export type ReminderSchedule = 'manual' | 'weekly_sunday' | 'biweekly' | 'monthly_1st' | 'overdue_15d';
export type ReminderChannel = 'whatsapp' | 'sms' | 'whatsapp_first_sms_fallback';

export interface ReminderSettings {
  default_threshold: number;         // e.g. 500, 1000, 2000, 5000
  message_tone: ReminderTone;        // 'polite' | 'standard' | 'firm'
  send_channel: ReminderChannel;     // 'whatsapp' | 'sms' | 'whatsapp_first_sms_fallback'
  include_upi_link: boolean;         // attach upi://pay deep link
  schedule: ReminderSchedule;        // in-app review notification cadence (never auto-sends)
  custom_note?: string;              // Custom note added to message
  auto_filter_high_trust: boolean;   // Exclude customers with trust score >= 90%
  quiet_hours_start: string;         // default "21:00" (9 PM)
  quiet_hours_end: string;           // default "08:00" (8 AM)
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  default_threshold: 1000,
  message_tone: 'polite',
  send_channel: 'whatsapp_first_sms_fallback',
  include_upi_link: true,
  schedule: 'manual',
  auto_filter_high_trust: true,
  quiet_hours_start: '21:00',
  quiet_hours_end: '08:00',
};

export interface Shop {
  id: string;
  name: string;
  owner_phone: string;
  upi_id?: string;
  pin_hash?: string;
  settings?: {
    language?: CustomerLanguage;
    credit_warning_limit?: number;
    voice_confirm?: boolean;
    sound_enabled?: boolean;
    reminder_settings?: ReminderSettings;
  };
  created_at?: string;
}

export interface User {
  id: string;
  shop_id: string;
  phone: string;
  name: string;
  role: UserRole;
  created_at?: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone?: string;
  preferred_language: CustomerLanguage;
  address_note?: string;
  credit_limit: number;
  balance_owed: number;
  trust_score?: number; // 0 - 100
  do_not_remind?: boolean;
  reminder_tone_override?: ReminderTone | null;
  last_reminded_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionItem {
  item_id?: string;
  name: string;
  quantity: number;
  unit?: string;
  price?: number;
}

export interface Transaction {
  id: string;
  shop_id: string;
  type: TransactionType;
  amount: number;
  items?: TransactionItem[];
  customer_id?: string | null;
  customer?: Customer;
  created_at: string;
  confirmed_by_voice: boolean;
  proof_clip_path?: string | null;
  voice_transcript?: string | null;
  client_sync_id?: string;
  synced?: boolean;
}

export interface Item {
  id: string;
  shop_id: string;
  name: string;
  synonyms: string[];
  unit: ItemUnit;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  min_threshold: number;
  created_at?: string;
  // Computed fields
  daily_avg_sales?: number;
  days_stock_left?: number;
}

export interface StockMovement {
  id: string;
  shop_id: string;
  item_id: string;
  transaction_id?: string | null;
  quantity_change: number;
  movement_type: 'sale' | 'purchase' | 'adjustment' | 'damage';
  notes?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  shop_id: string;
  name: string;
  phone?: string;
  category?: string;
  created_at?: string;
}

export interface SupplierOrder {
  id: string;
  shop_id: string;
  supplier_id: string;
  supplier_name?: string;
  items: Array<{
    item_id: string;
    item_name: string;
    quantity: number;
    unit: string;
    estimated_cost: number;
  }>;
  total_estimated: number;
  status: 'draft' | 'sent' | 'received' | 'cancelled';
  created_at: string;
}

export interface Reminder {
  id: string;
  shop_id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  amount: number;
  message_text: string;
  language: string;
  upi_link?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'paid';
  sent_at?: string;
  created_at: string;
}

export type ParsedIntent =
  | 'sale'
  | 'credit'
  | 'payment'
  | 'expense'
  | 'proof'
  | 'stock'
  | 'recovery'
  | 'summary'
  | 'ordering'
  | 'confirm_yes'
  | 'confirm_no'
  | 'undo'
  | 'reminder_settings'
  | 'unknown';

export interface ParseResult {
  intent: ParsedIntent;
  customer?: string | null;
  matchedCustomer?: Customer | null;
  ambiguousCustomers?: Customer[];
  amount?: number | null;
  item?: string | null;
  matchedItem?: Item | null;
  quantity?: number | null;
  unit?: string | null;
  language: 'hi' | 'pa' | 'en';
  confidence: number;
  rawText: string;
  spokenReply?: string;
  questionToAsk?: string | null;
}
