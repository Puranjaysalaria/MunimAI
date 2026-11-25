# DukaanAI — Voice & Tap Parity Matrix (`VOICE_PARITY.md`)

Every financial, inventory, customer, reminder, supplier-order, and bill-scan edit supports **full parity** between **Voice** and **Tap**, with safety-tier enforcement.

| Domain | Action | Voice Path | Tap Path | Safety Tier |
|---|---|---|---|---|
| **Pending Confirmation** | Edit amount, customer, item, qty, date, note; relative math (`200 aur jodo`, `double kar do`, `thoda kam karo`); pause (`ruko`) / cancel | Spoken while `ConfirmationCard` is open (`parsePendingCorrection`) | Tap `Haan` / `Nahi` / Edit controls on card | Voice `Haan` allowed only while mic pill active & card showing |
| **Saved Ledger Entry** | Edit amount, item, customer, qty, date, or note (`edit_entry`, `change_amount`, `change_item`, `change_customer`, `change_quantity`, `change_date`, `edit_note`) | Voice intent -> `resolveTargetEntry` -> `EntryDisambiguationModal` (if ambiguous) -> `ConfirmationCard` Diff | Ledger Passbook -> `Edit` button -> `EditTransactionModal` -> `ConfirmationCard` Diff | Standard edits: voice or tap. Over-threshold (`edit_rupee_threshold`), older than N days (`edit_age_days_threshold`), or with proof/reminder: **Tap Confirm Required** |
| **Correction Audit & History** | View original, reversal, correction records & audit log (`who`, `when`, `before`, `after`, `source`) | Automatic on every correction | Ledger Passbook `Edited` badge & `History` button | Immutable append-only (originals never overwritten) |
| **Undo Correction** | Undo most recent correction (`Wapas karo` / `Undo`) | Spoken `undo` | `UndoToast` button | Reverses balance & stock deltas, clears `superseded_by`, logs `undo` audit entry |
| **Delete Entry / Clip / Bill** | Delete transaction, audio proof clip, or bill | **Blocked by voice** (`deleteTapOnlyVoice`) | Ledger / BillScan trash button + confirmation | **Always Tap-Only** |
| **Customer Proof Recording** | Record 5-sec customer consent audio (or re-record after amount edit) | Voice prompt / warning only | Tap-only `Record Proof` / `Record New Proof` button with explicit consent box | **Always Tap-Only** |
| **Stock Count & Prices** | Update selling price, cost price, or current stock count | `set_selling_price`, `set_cost_price`, `parseStockCountEdit` | Stock screen item `Edit` modal + `Price History` view | Records `PriceHistoryEntry` + `AuditLogEntry` |
| **Customer Details** | Edit customer name spelling, phone number, preferred language | `parseCustomerDetailEdit` | Ledger Passbook header `Edit` modal & language dropdown | Logged & persisted |
| **Reminder Previews** | Change tone (`polite`/`standard`/`firm`), language, toggle UPI details | `parseReminderPreviewEdit` | `RecoveryModal` tone/language/UPI controls | Sending WhatsApp/SMS is **Tap-Only** |
| **Supplier Order List** | Adjust item quantities, add or remove items | `parseSupplierOrderEdit` | `SupplierOrdersModal` `+` / `-` / item controls | Dispatching order is **Tap-Only** |
| **Bill-Scan Review Lines** | Adjust rate/quantity or remove line before applying | `BillScanModal` voice listener | `BillScanModal` inline edit/checkboxes | Applying updates requires confirmation |
