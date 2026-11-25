import { useState, useRef, useCallback, useEffect } from 'react';
import { Customer, Item, Transaction, Supplier, Shop, AuditLogEntry } from '../types/schema';
import { createSTTProvider, STTProvider } from '../stt';
import { parseSpeech } from '../parser';
import { resolveCrossScriptCustomer } from '../voice/crossScriptMatcher';
import { parsePendingCorrection } from '../voice/pendingCorrectionParser';
import { resolveTargetEntry, extractNewEditValue } from '../voice/entryResolver';
import { analyzeEditSideEffects } from '../voice/sideEffectAnalyzer';
import { evaluateEditSafetyTier, canCompleteByVoiceConfirm } from '../voice/safetyTiers';
import { TransactionCorrectionPatch } from '../lib/correctionService';
import { PendingConfirmation } from '../components/ConfirmationCard/ConfirmationCard';
import { speechSynthesizer } from '../tts/speechSynthesizer';
import { playAudioCue, triggerHaptic } from '../lib/sound';
import { useI18n } from '../i18n';
import {
  compute14DayStockAnalysis,
  generateStockVoiceReply,
  computeDailySummary,
  generateDailySummaryVoice,
  findSupplierForItem,
} from '../lib/stockAnalytics';
import { formatItemName, formatUnit } from '../lib/nameTranslation';

interface UseVoiceControllerProps {
  customers: Customer[];
  items: Item[];
  suppliers?: Supplier[];
  transactions: Transaction[];
  isOnline: boolean;
  onSaveTransaction: (tx: Omit<Transaction, 'id' | 'shop_id' | 'created_at'>) => Transaction;
  onUndoLast: () => { success: boolean; message: string };
  onNavigateTab: (tab: 'home' | 'ledger' | 'stock' | 'today') => void;
  onOpenSupplierOrders?: (supplierId?: string) => void;
  onOpenDailySummary?: () => void;
  onOpenRecovery?: (threshold: number) => void;
  onOpenReminderSettings?: () => void;
  onOpenBillScan?: () => void;
  onUpdateItemPrice?: (itemNameOrId: string, updates: { selling_price?: number; cost_price?: number }) => { success: boolean; previousItem?: Item; updatedItem?: Item };
  onPriceActionConfirmed?: (action: { item: Item; priceType: 'selling' | 'cost'; oldPrice: number; newPrice: number; unit: string }) => void;
  onSelectCustomer?: (customerId: string) => void;
  onCloseModals?: () => void;
  onPlayProofClip?: (clipPath?: string) => void;
  onOpenProofRecorder?: () => void;
  activeStockItem?: Item | null;
  shopSettings?: Shop['settings'];
  selectedTransactionId?: string | null;
  onApplyTransactionCorrection?: (
    targetTxId: string,
    patch: TransactionCorrectionPatch,
    source?: 'voice' | 'tap',
    reason?: string
  ) => { success: boolean; correctionTx?: Transaction; auditLog?: AuditLogEntry; error?: string };
}

export function useVoiceController({
  customers,
  items,
  suppliers = [],
  transactions,
  isOnline,
  onSaveTransaction,
  onUndoLast,
  onNavigateTab,
  onOpenSupplierOrders,
  onOpenDailySummary,
  onOpenRecovery,
  onOpenReminderSettings,
  onOpenBillScan,
  onUpdateItemPrice,
  onPriceActionConfirmed,
  onSelectCustomer,
  onCloseModals,
  onPlayProofClip,
  onOpenProofRecorder,
  activeStockItem,
  shopSettings,
  selectedTransactionId,
  onApplyTransactionCorrection,
}: UseVoiceControllerProps) {
  const { language, t } = useI18n();
  const lastSpokenTextRef = useRef<string>('');

  const [isListening, setIsListening] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'thinking' | 'success' | 'error'>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [disambiguationCustomers, setDisambiguationCustomers] = useState<Customer[]>([]);
  const [disambiguationEntries, setDisambiguationEntries] = useState<Transaction[]>([]);
  const [disambiguationEntryQuestion, setDisambiguationEntryQuestion] = useState<string>('');
  const pendingEditRawTextRef = useRef<{ rawText: string; intent: string } | null>(null);

  const sttProviderRef = useRef<STTProvider | null>(null);
  const pendingConfirmationRef = useRef<PendingConfirmation | null>(null);
  const disambiguationCustomersRef = useRef<Customer[]>([]);
  const disambiguationEntriesRef = useRef<Transaction[]>([]);
  const cardAppearedAtRef = useRef<number>(0);
  const replySpeechStartedAtRef = useRef<number>(0);

  useEffect(() => {
    if (pendingConfirmation && !pendingConfirmationRef.current) {
      cardAppearedAtRef.current = Date.now();
    } else if (!pendingConfirmation) {
      cardAppearedAtRef.current = 0;
    }
    pendingConfirmationRef.current = pendingConfirmation;
  }, [pendingConfirmation]);

  useEffect(() => {
    disambiguationCustomersRef.current = disambiguationCustomers;
  }, [disambiguationCustomers]);

  useEffect(() => {
    disambiguationEntriesRef.current = disambiguationEntries;
  }, [disambiguationEntries]);

  // Open Diff Confirmation Card for any saved-entry edit (voice or tap parity)
  const openDiffConfirmationForEdit = useCallback(
    (
      targetTx: Transaction,
      patch: TransactionCorrectionPatch,
      source: 'voice' | 'tap' = 'voice',
      rawText: string = ''
    ) => {
      const oldCust = targetTx.customer_id
        ? customers.find((c) => c.id === targetTx.customer_id) || null
        : null;
      const newCustId =
        patch.customer_id !== undefined ? patch.customer_id : targetTx.customer_id;
      const newCust = newCustId
        ? customers.find((c) => c.id === newCustId) || null
        : null;

      const newItems = patch.items !== undefined ? patch.items : targetTx.items || [];
      const firstNewItem = newItems[0] || null;
      const firstOldItem = targetTx.items?.[0] || null;

      const sideEffects = analyzeEditSideEffects(targetTx, patch, customers, items);
      const safetyTier = evaluateEditSafetyTier(targetTx, patch, sideEffects, shopSettings);

      const newAmount = patch.amount !== undefined ? patch.amount : targetTx.amount;

      setPendingConfirmation({
        intent: targetTx.type as any,
        customer: newCust,
        customerName: newCust?.name || null,
        amount: newAmount,
        item: firstNewItem
          ? items.find((i) => i.name.toLowerCase() === firstNewItem.name.toLowerCase()) || null
          : null,
        itemName: firstNewItem?.name || null,
        quantity: firstNewItem?.quantity ?? null,
        unit: firstNewItem?.unit ?? null,
        date: patch.created_at ?? targetTx.created_at,
        note: patch.note !== undefined ? patch.note : targetTx.note ?? null,
        rawText: rawText || `Edit ${targetTx.id}`,
        editTargetTx: targetTx,
        editBefore: {
          amount: targetTx.amount,
          customerName: oldCust?.name || null,
          itemName: firstOldItem?.name || null,
          quantity: firstOldItem?.quantity ?? null,
          unit: firstOldItem?.unit ?? null,
          date: targetTx.created_at,
          note: targetTx.note ?? null,
        },
        sideEffects,
        safetyTier,
        editSource: source,
      });
    },
    [customers, items, shopSettings]
  );

  const handleSelectDisambiguatedEntry = useCallback(
    (tx: Transaction) => {
      const pendingRaw = pendingEditRawTextRef.current;
      const extracted = pendingRaw ? extractNewEditValue(pendingRaw.rawText, pendingRaw.intent) : {};
      const patch: TransactionCorrectionPatch = {};
      if (extracted.newAmount !== undefined) patch.amount = extracted.newAmount;
      if (extracted.newDate !== undefined) patch.created_at = extracted.newDate;
      if (extracted.newNote !== undefined) patch.note = extracted.newNote;
      if (extracted.newItem !== undefined || extracted.newQuantity !== undefined) {
        const baseItems =
          tx.items && tx.items.length > 0
            ? tx.items.map((it) => ({ ...it }))
            : [
                {
                  name: extracted.newItem || 'item',
                  quantity: extracted.newQuantity || 1,
                  unit: 'kilo',
                  price: tx.amount,
                },
              ];
        if (extracted.newItem) baseItems[0].name = extracted.newItem;
        if (extracted.newQuantity !== undefined) baseItems[0].quantity = extracted.newQuantity;
        patch.items = baseItems;
      }
      setDisambiguationEntries([]);
      disambiguationEntriesRef.current = [];
      pendingEditRawTextRef.current = null;
      openDiffConfirmationForEdit(tx, patch, 'voice', pendingRaw?.rawText || '');
    },
    [openDiffConfirmationForEdit]
  );

  // Stop listening
  const stopListening = useCallback(() => {
    if (sttProviderRef.current) {
      try {
        sttProviderRef.current.stopListening();
      } catch {}
    }
    setIsListening(false);
    setVoiceState((cur) => (cur === 'listening' ? 'idle' : cur));
    triggerHaptic('stop');
  }, []);

  // Process completed voice transcript or typed text
  const processInput = useCallback(
    async (text: string) => {
      setVoiceState('thinking');
      setLiveTranscript(text);

      try {
        const currentDisambig =
          disambiguationCustomersRef.current.length > 0
            ? disambiguationCustomersRef.current
            : disambiguationCustomers;

        if (currentDisambig.length > 0) {
          const isFirst = /\b(first(\s*one)?|number\s*(one|1)|pehla(\s*wala)?|ek|1|one|ਪਹਿਲਾ|पहला)\b/i.test(text);
          const isSecond = /\b(second(\s*one)?|number\s*(two|2)|doosra(\s*wala)?|do|2|two|ਦੂਜਾ|दूसरा)\b/i.test(text);
          const isThird = /\b(third(\s*one)?|number\s*(three|3)|teesra(\s*wala)?|teen|3|three|ਤੀਜਾ|तीसरा)\b/i.test(text);

          if (isFirst && currentDisambig[0]) {
            handleSelectDisambiguatedCustomer(currentDisambig[0]);
            return;
          }
          if (isSecond && currentDisambig[1]) {
            handleSelectDisambiguatedCustomer(currentDisambig[1]);
            return;
          }
          if (isThird && currentDisambig[2]) {
            handleSelectDisambiguatedCustomer(currentDisambig[2]);
            return;
          }

          const match = resolveCrossScriptCustomer(text, currentDisambig);
          if (match.matchedCustomer) {
            handleSelectDisambiguatedCustomer(match.matchedCustomer);
            return;
          }

          const lowerText = text.toLowerCase();
          const matchedByDetail = currentDisambig.find((c) => {
            const parts = c.name.toLowerCase().split(/\s+/);
            const surname = parts[parts.length - 1];
            const hasNameMatch = parts.some((part) => part.length >= 3 && lowerText.includes(part));
            const addressTokens = c.address_note
              ? c.address_note.toLowerCase().split(/[\s,()]+/).filter((w) => w.length >= 3)
              : [];
            const hasAddressMatch = addressTokens.some((token) => lowerText.includes(token));
            return (
              (surname.length >= 3 && lowerText.includes(surname)) ||
              hasNameMatch ||
              (c.address_note && lowerText.includes(c.address_note.toLowerCase())) ||
              hasAddressMatch
            );
          });
          if (matchedByDetail) {
            handleSelectDisambiguatedCustomer(matchedByDetail);
            return;
          }
        }

        // 00. Entry Disambiguation reply ("pehla", "doosra", "500 wala")
        const currentEntryDisambig = disambiguationEntriesRef.current;
        if (currentEntryDisambig.length > 0) {
          const isFirst = /\b(first(\s*one)?|number\s*(one|1)|pehla(\s*wala)?|ek|1|one|ਪਹਿਲਾ|पहला)\b/i.test(text);
          const isSecond = /\b(second(\s*one)?|number\s*(two|2)|doosra(\s*wala)?|do|2|two|ਦੂਜਾ|दूसरा)\b/i.test(text);
          const isThird = /\b(third(\s*one)?|number\s*(three|3)|teesra(\s*wala)?|teen|3|three|ਤੀਜਾ|तीसरा)\b/i.test(text);

          let chosenEntry: Transaction | undefined;
          if (isFirst) chosenEntry = currentEntryDisambig[0];
          else if (isSecond) chosenEntry = currentEntryDisambig[1];
          else if (isThird) chosenEntry = currentEntryDisambig[2];
          else {
            const numMatch = text.match(/\b(\d+)\b/);
            if (numMatch) {
              chosenEntry = currentEntryDisambig.find((tx) => Number(tx.amount) === Number(numMatch[1]));
            }
          }

          if (chosenEntry) {
            handleSelectDisambiguatedEntry(chosenEntry);
            return;
          }
        }

        // 0. Pending Confirmation In-Place Correction (without restarting)
        const activePending = pendingConfirmationRef.current;
        if (activePending && currentDisambig.length === 0) {
          const correction = parsePendingCorrection(text, activePending, {
            language,
            customers,
            items,
          });

          if (correction.type === 'confirm_yes') {
            handleConfirmSave();
            return;
          }

          if (correction.type === 'cancel') {
            handleCancelConfirmation();
            return;
          }

          if (correction.type === 'pause') {
            stopListening();
            setPendingConfirmation((prev) => (prev ? { ...prev, isPaused: true } : null));
            const pauseMsg =
              language === 'en'
                ? 'Paused. Tap Yes to save or Cancel to discard.'
                : language === 'pa'
                ? 'ਠੀਕ ਹੈ, ਰੁਕੇ ਹਾਂ। ਸੇਵ ਕਰਨ ਲਈ ਹਾਂ ਦਬਾਓ।'
                : 'ठीक है, रुके हुए हैं। सेव करने के लिए हाँ बोलें या दबाएँ।';
            speechSynthesizer.speak(pauseMsg, language);
            setVoiceState('idle');
            return;
          }

          if (correction.type === 'update_slots') {
            if (correction.ambiguousCustomers && correction.ambiguousCustomers.length > 1) {
              triggerHaptic('warning');
              setDisambiguationCustomers(correction.ambiguousCustomers);
              disambiguationCustomersRef.current = correction.ambiguousCustomers;
              speechSynthesizer.speak(correction.spokenReadback, language);
              setVoiceState('idle');
              return;
            }

            triggerHaptic('light');
            playAudioCue('start');
            setPendingConfirmation((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                amount: correction.newAmount !== undefined ? correction.newAmount : prev.amount,
                customer: correction.newCustomer !== undefined ? correction.newCustomer : prev.customer,
                customerName:
                  correction.newCustomerName !== undefined ? correction.newCustomerName : prev.customerName,
                item: correction.newItem !== undefined ? correction.newItem : prev.item,
                itemName: correction.newItemName !== undefined ? correction.newItemName : prev.itemName,
                quantity: correction.newQuantity !== undefined ? correction.newQuantity : prev.quantity,
                unit: correction.newUnit !== undefined ? correction.newUnit : prev.unit,
                date: correction.newDate !== undefined ? correction.newDate : prev.date,
                note: correction.newNote !== undefined ? correction.newNote : prev.note,
                isPaused: false,
                changedFields: correction.updatedFields,
                lastCorrectionReadback: correction.spokenReadback,
              };
            });
            setVoiceState('idle');
            return;
          }

          if (correction.type === 'no_match') {
            triggerHaptic('warning');
            setVoiceState('idle');
            speechSynthesizer.speak(t.voice.noiseError, language).then(() => {
              if (pendingConfirmationRef.current && !pendingConfirmationRef.current.isPaused) {
                startListeningForReply();
              }
            });
            return;
          }
        }

        // Safety Tier: Delete entry / clip / bill is ALWAYS tap-only
        if (
          /\b(delete|remove|erase|mita\s*do|hata\s*do|udaa\s*do)\b/i.test(text) &&
          /\b(entry|transaction|clip|proof|recording|bill|invoice|record|hisab)\b/i.test(text)
        ) {
          triggerHaptic('warning');
          speechSynthesizer.speak(t.editing.deleteTapOnlyVoice, language);
          setVoiceState('idle');
          return;
        }

        const result = await parseSpeech(text, {
          customers,
          items,
          isOnline,
          language,
          activeItem: activeStockItem,
        });

        // 1. Control Intents
        if (result.intent === 'confirm_yes') {
          if (pendingConfirmation) {
            handleConfirmSave();
          } else {
            speechSynthesizer.speak(
              language === 'en'
                ? 'Yes, what should I record?'
                : language === 'pa'
                ? 'ਹਾਂ ਜੀ, ਕੀ ਲਿਖਣਾ ਹੈ?'
                : 'हाँ, बताइए क्या लिखना है?',
              language
            );
            setVoiceState('idle');
          }
          return;
        }

        if (result.intent === 'confirm_no') {
          handleCancelConfirmation();
          return;
        }

        if (result.intent === 'undo') {
          const res = onUndoLast();
          playAudioCue('cancel');
          speechSynthesizer.speak(res.message, language);
          setVoiceState('idle');
          return;
        }

        // 2. Query Intents
        if (result.intent === 'summary') {
          setVoiceState('success');
          onNavigateTab('today');
          const summary = computeDailySummary(transactions);
          const summaryVoice = generateDailySummaryVoice(summary, language);
          speechSynthesizer.speak(summaryVoice, language);
          if (onOpenDailySummary) {
            onOpenDailySummary();
          }
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'ordering') {
          setVoiceState('success');
          onNavigateTab('stock');
          const analyses = compute14DayStockAnalysis(items, transactions);
          const lowStockAnalyses = analyses.filter(
            (a) => a.isLowStock || (a.daysStockLeft !== null && a.daysStockLeft < 2) || a.suggestedReorderQty > 0
          );
          let targetSupplier: Supplier | null = null;
          if (lowStockAnalyses.length > 0 && suppliers) {
            targetSupplier = findSupplierForItem(lowStockAnalyses[0].item, suppliers);
          }
          const orderVoice =
            language === 'en'
              ? (targetSupplier ? `Order prepared for ${targetSupplier.name}.` : 'Supplier order list prepared based on 14-day consumption.')
              : language === 'pa'
              ? (targetSupplier ? `${targetSupplier.name} ਲਈ ਆਰਡਰ ਤਿਆਰ ਹੈ।` : 'ਸਪਲਾਇਰ ਆਰਡਰ ਸੂਚੀ ਤਿਆਰ ਹੈ। 14 ਦਿਨਾਂ ਦੀ ਵਿਕਰੀ ਅਨੁਸਾਰ ਆਰਡਰ ਬਣਾਇਆ ਗਿਆ ਹੈ।')
              : (targetSupplier ? `${targetSupplier.name} के लिए ऑर्डर तैयार है।` : 'सप्लायर आर्डर लिस्ट तैयार है। 14 दिनों की बिक्री के अनुसार आर्डर बनाया गया है।');
          speechSynthesizer.speak(orderVoice, language);
          if (onOpenSupplierOrders) {
            onOpenSupplierOrders(targetSupplier ? targetSupplier.id : undefined);
          }
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'reminder_settings') {
          setVoiceState('success');
          const replyVoice =
            language === 'en'
              ? 'Opening reminder settings.'
              : language === 'pa'
              ? 'ਯਾਦ-ਪੱਤਰ ਸੈਟਿੰਗਾਂ ਖੋਲ੍ਹੀਆਂ ਜਾ ਰਹੀਆਂ ਹਨ।'
              : 'तगादा सेटिंग्स खोली जा रही हैं।';
          speechSynthesizer.speak(replyVoice, language);
          if (onOpenReminderSettings) {
            onOpenReminderSettings();
          }
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'recovery') {
          setVoiceState('success');
          onNavigateTab('ledger');
          const recoveryThreshold = result.amount || 1000;
          const recoveryVoice =
            language === 'en'
              ? `Customers owing over ₹${recoveryThreshold}. Send reminders?`
              : language === 'pa'
              ? `₹${recoveryThreshold} ਤੋਂ ਵੱਧ ਬਾਕੀ ਵਾਲੇ ਗਾਹਕਾਂ ਨੂੰ ਯਾਦ-ਪੱਤਰ ਭੇਜਣਾ ਹੈ?`
              : `₹${recoveryThreshold} से ज़्यादा बाकी वाले ग्राहकों की लिस्ट। तगादा भेजें?`;
          speechSynthesizer.speak(recoveryVoice, language);
          if (onOpenRecovery) {
            onOpenRecovery(recoveryThreshold);
          }
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'stock') {
          setVoiceState('success');
          onNavigateTab('stock');
          const analyses = compute14DayStockAnalysis(items, transactions);
          const matchedItem = result.matchedItem;

          if (matchedItem) {
            const analysis =
              analyses.find((a) => a.item.id === matchedItem.id) || {
                item: matchedItem,
                totalSold14Days: 0,
                dailyAvgSales: matchedItem.daily_avg_sales || 2,
                daysStockLeft: matchedItem.days_stock_left || 5,
                isLowStock: matchedItem.current_stock <= matchedItem.min_threshold,
                isCritical: (matchedItem.days_stock_left || 5) < 2,
                suggestedReorderQty: 10,
                estimatedReorderCost: 500,
              };

            const stockReply = generateStockVoiceReply(analysis, language);
            speechSynthesizer.speak(stockReply, language);
          } else {
            const lowCount = analyses.filter((a) => a.isLowStock).length;
            const genericReply =
              language === 'en'
                ? `Inventory opened. Total ${lowCount} items running low.`
                : language === 'pa'
                ? `ਸਟਾਕ ਖੋਲ੍ਹਿਆ ਗਿਆ ਹੈ। ਕੁੱਲ ${lowCount} ਚੀਜ਼ਾਂ ਘੱਟ ਹਨ।`
                : `स्टॉक खोला गया है। कुल ${lowCount} सामान का स्टॉक कम है।`;
            speechSynthesizer.speak(genericReply, language);
          }
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        // Navigation Intents (Direct Voice Navigation)
        if (result.intent === 'open_bill_scan') {
          setVoiceState('success');
          speechSynthesizer.speak(t.navigation.billScanVoice, language);
          if (onOpenBillScan) {
            onOpenBillScan();
          }
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'open_stock') {
          setVoiceState('success');
          onNavigateTab('stock');
          speechSynthesizer.speak(t.navigation.openingStockVoice, language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'open_ledger') {
          setVoiceState('success');
          onNavigateTab('ledger');
          speechSynthesizer.speak(t.navigation.openingLedgerVoice, language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'open_today') {
          setVoiceState('success');
          onNavigateTab('today');
          speechSynthesizer.speak(t.navigation.openingTodayVoice, language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        // Multilingual Voice Intents
        if (result.intent === 'show_low_stock') {
          setVoiceState('success');
          onNavigateTab('stock');

          const analyses = compute14DayStockAnalysis(items, transactions);
          const lowItems = analyses.filter(
            (a) => a.isLowStock || (a.daysStockLeft !== null && a.daysStockLeft < 2)
          );

          let reply: string;
          if (lowItems.length === 0) {
            reply =
              language === 'en'
                ? 'All items are in stock. No items are running low.'
                : language === 'pa'
                ? 'ਸਾਰਾ ਸਾਮਾਨ ਸਟਾਕ ਵਿੱਚ ਹੈ। ਕੋਈ ਵੀ ਸਾਮਾਨ ਘੱਟ ਨਹੀਂ ਹੈ।'
                : 'सभी सामान स्टॉक में हैं। कोई भी सामान कम नहीं है।';
          } else {
            const topLow = lowItems.slice(0, 3);
            const itemsList = topLow
              .map(
                (a) =>
                  `${formatItemName(a.item.name, language)} (${a.item.current_stock} ${formatUnit(a.item.unit, language)})`
              )
              .join(', ');
            const remainingCount = lowItems.length - topLow.length;

            if (language === 'en') {
              reply =
                remainingCount > 0
                  ? `${itemsList} and ${remainingCount} more items are running low.`
                  : `${itemsList} ${lowItems.length === 1 ? 'is' : 'are'} running low.`;
            } else if (language === 'pa') {
              reply =
                remainingCount > 0
                  ? `${itemsList} ਅਤੇ ${remainingCount} ਹੋਰ ਚੀਜ਼ਾਂ ਘੱਟ ਹਨ।`
                  : `${itemsList} ਦਾ ਸਟਾਕ ਘੱਟ ਹੈ।`;
            } else {
              reply =
                remainingCount > 0
                  ? `${itemsList} और ${remainingCount} अन्य सामान का स्टॉक कम है।`
                  : `${itemsList} का स्टॉक कम है।`;
            }
          }

          lastSpokenTextRef.current = reply;
          speechSynthesizer.speak(reply, language);
          setTimeout(() => setVoiceState('idle'), 2000);
          return;
        }

        if (result.intent === 'order_item' || result.intent === 'build_order_list') {
          setVoiceState('success');
          onNavigateTab('stock');

          const analyses = compute14DayStockAnalysis(items, transactions);
          const lowStockAnalyses = analyses.filter(
            (a) => a.isLowStock || (a.daysStockLeft !== null && a.daysStockLeft < 2) || a.suggestedReorderQty > 0
          );

          let targetItem =
            result.matchedItem ||
            (result.item
              ? items.find((i) => i.name.toLowerCase() === result.item?.toLowerCase())
              : null);
          if (!targetItem && lowStockAnalyses.length > 0) {
            targetItem = lowStockAnalyses[0].item;
          }

          let targetSupplier: Supplier | null = null;
          if (targetItem && suppliers) {
            targetSupplier = findSupplierForItem(targetItem, suppliers);
          }

          if (onOpenSupplierOrders) {
            onOpenSupplierOrders(targetSupplier ? targetSupplier.id : undefined);
          }

          let reply: string;
          if (targetSupplier) {
            reply =
              language === 'en'
                ? `Order prepared for ${targetSupplier.name}.`
                : language === 'pa'
                ? `${targetSupplier.name} ਲਈ ਆਰਡਰ ਤਿਆਰ ਹੈ।`
                : `${targetSupplier.name} के लिए ऑर्डर तैयार है।`;
          } else {
            reply = t.voiceCommands.orderPreparedReply;
          }

          lastSpokenTextRef.current = reply;
          speechSynthesizer.speak(reply, language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'send_order') {
          // Manual Consent & Safety Invariant: Voice opens review screen only, never dispatches externally
          setVoiceState('success');
          if (onOpenSupplierOrders) onOpenSupplierOrders();
          const reply = t.voiceCommands.cannotSendByVoice;
          lastSpokenTextRef.current = reply;
          speechSynthesizer.speak(reply, language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'show_customer_ledger') {
          if (result.ambiguousCustomers && result.ambiguousCustomers.length > 1) {
            triggerHaptic('warning');
            setDisambiguationCustomers(result.ambiguousCustomers);
            disambiguationCustomersRef.current = result.ambiguousCustomers;
            setPendingConfirmation({
              intent: 'show_customer_ledger',
              amount: 0,
              rawText: text,
              spokenReply: result.spokenReply,
            });
            const disambiguationPrompt =
              language === 'en'
                ? 'Which customer?'
                : language === 'pa'
                ? 'ਕਿਹੜਾ ਗਾਹਕ?'
                : 'कौनसा ग्राहक?';
            const promptText = result.spokenReply || disambiguationPrompt;
            speechSynthesizer.speak(promptText, language);
            setVoiceState('idle');
            setTimeout(() => {
              startListening();
            }, 1800);
            return;
          }

          setVoiceState('success');
          onNavigateTab('ledger');
          let targetCustomer = result.matchedCustomer;
          if (!targetCustomer && result.customer) {
            targetCustomer = customers.find(
              (c) => c.name.toLowerCase() === result.customer?.toLowerCase()
            ) || null;
          }
          if (targetCustomer && onSelectCustomer) {
            onSelectCustomer(targetCustomer.id);
          }
          const reply = targetCustomer
            ? (language === 'en'
                ? `Opening ${targetCustomer.name}'s ledger record.`
                : language === 'pa'
                ? `${targetCustomer.name} ਦਾ ਖਾਤਾ ਖੋਲ੍ਹਿਆ ਗਿਆ`
                : `${targetCustomer.name} का खाता खोला गया`)
            : (result.spokenReply || t.voiceCommands.ledgerOpenedReply);
          lastSpokenTextRef.current = reply;
          speechSynthesizer.speak(reply, language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'recent_transactions') {
          setVoiceState('success');
          onNavigateTab('today');
          const reply = t.voiceCommands.recentTransactionsReply;
          lastSpokenTextRef.current = reply;
          speechSynthesizer.speak(reply, language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'top_debtors') {
          setVoiceState('success');
          onNavigateTab('ledger');
          if (onOpenRecovery) onOpenRecovery(500);
          const reply = t.voiceCommands.topDebtorsReply;
          lastSpokenTextRef.current = reply;
          speechSynthesizer.speak(reply, language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'monthly_credit_summary') {
          setVoiceState('success');
          onNavigateTab('today');
          const reply = t.voiceCommands.monthlySummaryReply;
          lastSpokenTextRef.current = reply;
          speechSynthesizer.speak(reply, language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'next') {
          setVoiceState('success');
          const reply = t.voiceCommands.nextAction;
          lastSpokenTextRef.current = reply;
          speechSynthesizer.speak(reply, language);
          setTimeout(() => setVoiceState('idle'), 1200);
          return;
        }

        if (result.intent === 'previous') {
          setVoiceState('success');
          const reply = t.voiceCommands.previousAction;
          lastSpokenTextRef.current = reply;
          speechSynthesizer.speak(reply, language);
          setTimeout(() => setVoiceState('idle'), 1200);
          return;
        }

        if (result.intent === 'repeat') {
          setVoiceState('success');
          const reply = lastSpokenTextRef.current || t.voice.tapToSpeak;
          speechSynthesizer.speak(reply, language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'back' || result.intent === 'close') {
          setVoiceState('success');
          if (onCloseModals) onCloseModals();
          const reply = t.voiceCommands.closed;
          lastSpokenTextRef.current = reply;
          speechSynthesizer.speak(reply, language);
          setTimeout(() => setVoiceState('idle'), 1200);
          return;
        }

        if (result.intent === 'today' || result.intent === 'yesterday' || result.intent === 'this_week') {
          setVoiceState('success');
          onNavigateTab('today');
          const reply = t.navigation.openingTodayVoice;
          lastSpokenTextRef.current = reply;
          speechSynthesizer.speak(reply, language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'play_proof') {
          setVoiceState('success');
          const reply = t.voiceCommands.playProofReply;
          lastSpokenTextRef.current = reply;
          speechSynthesizer.speak(reply, language);
          if (onPlayProofClip) onPlayProofClip();
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'proof') {
          setVoiceState('success');
          if (onOpenProofRecorder) onOpenProofRecorder();
          setTimeout(() => setVoiceState('idle'), 1200);
          return;
        }

        // Saved-Entry Edit Intents (Part 2 + Part 4 Diff Confirmation)
        if (
          result.intent === 'edit_entry' ||
          result.intent === 'change_amount' ||
          result.intent === 'change_item' ||
          result.intent === 'change_customer' ||
          result.intent === 'change_quantity' ||
          result.intent === 'change_date' ||
          result.intent === 'edit_note'
        ) {
          const res = resolveTargetEntry(
            {
              rawText: text,
              customerName: result.customer,
              matchedCustomer: result.matchedCustomer,
              itemName: result.item,
              timeframe: result.timeframe,
              selectedTransactionId,
            },
            transactions,
            customers,
            language
          );

          if (res.status === 'not_found') {
            triggerHaptic('warning');
            speechSynthesizer.speak(res.message, language);
            setVoiceState('idle');
            return;
          }

          if (res.status === 'ambiguous') {
            triggerHaptic('warning');
            pendingEditRawTextRef.current = { rawText: text, intent: result.intent };
            setDisambiguationEntries(res.candidates);
            disambiguationEntriesRef.current = res.candidates;
            setDisambiguationEntryQuestion(res.question);
            speechSynthesizer.speak(res.question, language);
            setVoiceState('idle');
            return;
          }

          // Resolved to single entry -> compute patch & open Diff Confirmation Card
          const extracted = extractNewEditValue(text, result.intent);
          const patch: TransactionCorrectionPatch = {};
          if (extracted.newAmount !== undefined) patch.amount = extracted.newAmount;
          if (extracted.newDate !== undefined) patch.created_at = extracted.newDate;
          if (extracted.newNote !== undefined) patch.note = extracted.newNote;
          if (extracted.newItem !== undefined || extracted.newQuantity !== undefined) {
            const baseItems = res.entry.items && res.entry.items.length > 0
              ? res.entry.items.map((it) => ({ ...it }))
              : [{ name: extracted.newItem || 'item', quantity: extracted.newQuantity || 1, unit: result.unit || 'kilo', price: res.entry.amount }];
            if (extracted.newItem) baseItems[0].name = extracted.newItem;
            if (extracted.newQuantity !== undefined) baseItems[0].quantity = extracted.newQuantity;
            patch.items = baseItems;
          }

          openDiffConfirmationForEdit(res.entry, patch, 'voice', text);
          setVoiceState('idle');
          return;
        }

        // Price Action Intents (set_selling_price / set_cost_price)
        if (result.intent === 'set_selling_price' || result.intent === 'set_cost_price') {
          const priceType: 'selling' | 'cost' = result.intent === 'set_cost_price' ? 'cost' : 'selling';
          const matchedItem =
            result.matchedItem ||
            items.find((i) => i.name.toLowerCase() === (result.item || '').toLowerCase()) ||
            activeStockItem ||
            null;

          if (!result.amount) {
            // Price amount not specified in voice query (e.g. "change selling price of this")
            const reply =
              result.spokenReply ||
              result.questionToAsk ||
              (language === 'en'
                ? `What is the new ${priceType} price?`
                : language === 'pa'
                ? `ਨਵਾਂ ਰੇਟ ਕਿੰਨਾ ਲਗਾਉਣਾ ਹੈ?`
                : `नया रेट कितना लगाना है?`);
            lastSpokenTextRef.current = reply;
            speechSynthesizer.speak(reply, language);
            setVoiceState('idle');
            return;
          }

          const oldPrice =
            result.oldPrice !== undefined && result.oldPrice !== null
              ? result.oldPrice
              : matchedItem
              ? (priceType === 'cost' ? matchedItem.cost_price : matchedItem.selling_price)
              : null;

          setPendingConfirmation({
            intent: result.intent,
            amount: result.amount || 0,
            item: matchedItem || null,
            itemName: matchedItem?.name || result.item || 'Item',
            unit: result.unit || matchedItem?.unit || 'kilo',
            oldPrice,
            priceType,
            rawText: text,
            spokenReply: result.spokenReply,
          });

          setVoiceState('idle');
          return;
        }

        // 3. Low confidence / Unknown
        if (result.confidence < 0.7 || result.intent === 'unknown') {
          triggerHaptic('warning');
          setVoiceState('error');
          setErrorMessage(t.voice.noiseError);
          setConsecutiveFailures((prev) => prev + 1);
          speechSynthesizer.speak(t.voice.noiseError, language);
          return;
        }

        // Success - Reset failures
        setConsecutiveFailures(0);

        // 4. Disambiguation Check ("Kaunsa Ramesh?")
        if (result.ambiguousCustomers && result.ambiguousCustomers.length > 1) {
          triggerHaptic('warning');
          setDisambiguationCustomers(result.ambiguousCustomers);
          setPendingConfirmation({
            intent: result.intent,
            amount: result.amount || 0,
            itemName: result.item,
            quantity: result.quantity,
            unit: result.unit,
            rawText: text,
            spokenReply: result.spokenReply,
          });
          const disambiguationPrompt =
            language === 'en'
              ? 'Which customer?'
              : language === 'pa'
              ? 'ਕਿਹੜਾ ਗਾਹਕ?'
              : 'कौनसा ग्राहक?';
          speechSynthesizer.speak(result.spokenReply || disambiguationPrompt, language);
          setVoiceState('idle');
          return;
        }

        // 5. Standard Confirmation Flow (Sale, Credit, Payment, Expense)
        let resolvedCustomer = result.matchedCustomer;
        if (!resolvedCustomer && result.customer) {
          resolvedCustomer = customers.find(
            (c) => c.name.toLowerCase() === result.customer?.toLowerCase()
          ) || null;
        }

        // Calculate sale amount if item known but amount omitted
        let finalAmount = result.amount || 0;
        if (finalAmount === 0 && result.matchedItem) {
          finalAmount = (result.quantity || 1) * result.matchedItem.selling_price;
        }

        setPendingConfirmation({
          intent: result.intent,
          customer: resolvedCustomer,
          customerName: resolvedCustomer ? resolvedCustomer.name : result.customer,
          amount: finalAmount,
          item: result.matchedItem,
          itemName: result.matchedItem?.name || result.item,
          quantity: result.quantity,
          unit: result.unit,
          rawText: text,
          spokenReply: result.spokenReply,
        });

        setVoiceState('idle');
      } catch (err: any) {
        setVoiceState('error');
        setErrorMessage(err?.message || t.voice.noiseError);
        speechSynthesizer.speak(t.voice.noiseError, language);
      }
    },
    [
      customers,
      items,
      transactions,
      isOnline,
      pendingConfirmation,
      language,
      t,
      onUndoLast,
      onNavigateTab,
      onOpenSupplierOrders,
      onOpenDailySummary,
      onOpenRecovery,
      onOpenReminderSettings,
      onOpenBillScan,
    ]
  );

  // Start voice listening (or toggle off if already listening)
  const startListening = useCallback(() => {
    if (isListening || voiceState === 'listening') {
      stopListening();
      return;
    }

    triggerHaptic('start');
    playAudioCue('start');
    setErrorMessage(null);
    setLiveTranscript('');
    setVoiceState('listening');
    setIsListening(true);

    const provider = createSTTProvider();
    sttProviderRef.current = provider;

    provider.startListening(
      {
        language,
        continuous: false,
        interimResults: true,
      },
      {
        onResult: (res) => {
          setLiveTranscript(res.transcript);
          if (res.isFinal) {
            stopListening();
            processInput(res.transcript);
          }
        },
        onError: (err) => {
          setIsListening(false);
          if (err.code === 'not-allowed') {
            setVoiceState('error');
            setErrorMessage(t.voice.micPermissionDenied);
            triggerHaptic('error');
          } else if (err.code === 'no-speech') {
            // User hesitated or brief silence - smoothly return to idle without locking a red error box
            setVoiceState('idle');
          } else {
            setVoiceState('error');
            setErrorMessage(t.voice.noiseError);
            triggerHaptic('error');
            // Auto dismiss error message after 4.5 seconds so user isn't stuck
            setTimeout(() => {
              setErrorMessage((cur) => (cur === t.voice.noiseError ? null : cur));
              setVoiceState((cur) => (cur === 'error' ? 'idle' : cur));
            }, 4500);
          }
        },
        onStateChange: (state) => {
          if (state === 'idle') {
            setIsListening(false);
            setVoiceState((cur) => (cur === 'listening' ? 'idle' : cur));
          } else if (state === 'listening') {
            setIsListening(true);
            setVoiceState('listening');
          }
        },
      }
    );
  }, [language, isListening, voiceState, stopListening, processInput, t]);

  // Confirm and save the pending transaction (or apply append-only correction)
  const handleConfirmSave = useCallback((confirmSource: 'voice' | 'tap' = 'voice') => {
    const pending = pendingConfirmationRef.current;
    if (!pending) return;

    // Part 6 Safety Tier Enforcement: high-risk / proof / reminder / over-threshold edits CANNOT complete by voice
    if (
      confirmSource === 'voice' &&
      !canCompleteByVoiceConfirm({
        isPillActive: true,
        isCardShowing: Boolean(pending),
        safetyTier: pending.safetyTier,
      })
    ) {
      triggerHaptic('warning');
      speechSynthesizer.speak(t.editing.tapConfirmVoiceNotice, language);
      return;
    }

    if (sttProviderRef.current) {
      try {
        sttProviderRef.current.stopListening();
      } catch {}
    }
    setIsListening(false);

    triggerHaptic('success');
    playAudioCue('success');

    // Handle Saved-Entry Diff Correction (Parts 3 & 4)
    if (pending.editTargetTx && onApplyTransactionCorrection) {
      const patch: TransactionCorrectionPatch = {
        amount: pending.amount,
        customer_id: pending.customer?.id ?? pending.editTargetTx.customer_id ?? null,
        items: pending.itemName
          ? [
              {
                name: pending.itemName,
                quantity: pending.quantity || 1,
                unit: pending.unit || 'kilo',
                price: pending.amount,
              },
            ]
          : pending.editTargetTx.items,
        created_at: pending.date ?? pending.editTargetTx.created_at,
        note: pending.note !== undefined ? pending.note : pending.editTargetTx.note,
      };
      onApplyTransactionCorrection(
        pending.editTargetTx.id,
        patch,
        pending.editSource || confirmSource,
        pending.rawText
      );
      const editDoneVoice =
        language === 'en'
          ? `Entry updated to ₹${pending.amount}.`
          : language === 'pa'
          ? `ਐਂਟਰੀ ₹${pending.amount} ਵਿੱਚ ਬਦਲ ਦਿੱਤੀ ਗਈ।`
          : `एंट्री ₹${pending.amount} में बदल दी गई।`;
      speechSynthesizer.speak(editDoneVoice, language);
      setPendingConfirmation(null);
      setDisambiguationCustomers([]);
      setDisambiguationEntries([]);
      setVoiceState('success');
      setTimeout(() => {
        setVoiceState('idle');
        setLiveTranscript('');
      }, 1200);
      return;
    }

    // Handle price update confirmation (set_selling_price / set_cost_price)
    if (pending.intent === 'set_selling_price' || pending.intent === 'set_cost_price') {
      const priceType: 'selling' | 'cost' = pending.intent === 'set_cost_price' ? 'cost' : 'selling';
      const targetName = pending.itemName || pending.item?.name || 'Item';
      const newPrice = pending.amount;
      const oldPrice = pending.oldPrice ?? (pending.item ? (priceType === 'cost' ? pending.item.cost_price : pending.item.selling_price) : 0);
      const unit = pending.unit || pending.item?.unit || 'unit';

      let updatedItem = pending.item;
      if (onUpdateItemPrice) {
        const res = onUpdateItemPrice(targetName, {
          [priceType === 'selling' ? 'selling_price' : 'cost_price']: newPrice,
        });
        if (res.updatedItem) {
          updatedItem = res.updatedItem;
        }
      }

      // Speak one short sentence
      const template = priceType === 'cost'
        ? t.priceAction.costPriceSetVoice
        : t.priceAction.sellingPriceSetVoice;

      const spokenSentence = template
        .replace('{item}', targetName)
        .replace('{price}', String(newPrice))
        .replace('{unit}', unit);

      speechSynthesizer.speak(spokenSentence, language);

      const itemObj: Item = updatedItem || pending.item || {
        id: `item-${Date.now()}`,
        shop_id: 'default-shop',
        name: targetName,
        synonyms: [],
        current_stock: 10,
        min_threshold: 3,
        cost_price: priceType === 'cost' ? newPrice : 0,
        selling_price: priceType === 'selling' ? newPrice : 0,
        unit: (unit as any) || 'kilo',
        created_at: new Date().toISOString(),
      };

      if (onPriceActionConfirmed) {
        onPriceActionConfirmed({
          item: itemObj,
          priceType,
          oldPrice,
          newPrice,
          unit,
        });
      }

      setPendingConfirmation(null);
      setDisambiguationCustomers([]);
      setVoiceState('success');
      setTimeout(() => {
        setVoiceState('idle');
        setLiveTranscript('');
      }, 1200);
      return;
    }

    const txType =
      pending.intent === 'credit'
        ? 'credit'
        : pending.intent === 'payment'
        ? 'payment'
        : pending.intent === 'expense'
        ? 'expense'
        : 'sale';

    // Construct items array
    const txItems = pending.itemName
      ? [
          {
            name: pending.itemName,
            quantity: pending.quantity || 1,
            unit: pending.unit || 'kilo',
            price: pending.amount,
          },
        ]
      : [];

    onSaveTransaction({
      type: txType,
      amount: pending.amount,
      customer_id: pending.customer?.id || null,
      items: txItems,
      confirmed_by_voice: true,
      voice_transcript: pending.rawText,
    });

    const successVoice =
      language === 'en'
        ? `Transaction of ₹${pending.amount} recorded.`
        : language === 'pa'
        ? 'ਹਾਂ ਜੀ, ਸੌਦਾ ਲਿਖ ਦਿੱਤਾ ਗਿਆ ਹੈ'
        : `हाँ, ₹${pending.amount} का लेन-देन लिख दिया गया है`;

    speechSynthesizer.speak(successVoice, language);

    setPendingConfirmation(null);
    setDisambiguationCustomers([]);
    setVoiceState('success');
    setTimeout(() => {
      setVoiceState('idle');
      setLiveTranscript('');
    }, 1200);
  }, [onSaveTransaction, onApplyTransactionCorrection, language, t, onUpdateItemPrice, onPriceActionConfirmed]);

  // Cancel pending confirmation
  const handleCancelConfirmation = useCallback(() => {
    if (sttProviderRef.current) {
      try {
        sttProviderRef.current.stopListening();
      } catch {}
    }
    setIsListening(false);

    triggerHaptic('stop');
    playAudioCue('cancel');
    setPendingConfirmation(null);
    setDisambiguationCustomers([]);
    disambiguationCustomersRef.current = [];
    setVoiceState('idle');
    setLiveTranscript('');
    const cancelVoice =
      language === 'en'
        ? 'Cancelled'
        : language === 'pa'
        ? 'ਰੱਦ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ'
        : 'रद्द कर दिया गया है';
    speechSynthesizer.speak(cancelVoice, language);
  }, [language]);

  // Resolve disambiguation selection
  const handleSelectDisambiguatedCustomer = useCallback(
    (customer: Customer) => {
      const pending = pendingConfirmationRef.current || pendingConfirmation;
      if (pending && pending.intent === 'show_customer_ledger') {
        onNavigateTab('ledger');
        if (onSelectCustomer) {
          onSelectCustomer(customer.id);
        }
        const reply =
          language === 'en'
            ? `Opening ${customer.name}'s ledger record.`
            : language === 'pa'
            ? `${customer.name} ਦਾ ਖਾਤਾ ਖੋਲ੍ਹਿਆ ਗਿਆ`
            : `${customer.name} का खाता खोला गया`;
        lastSpokenTextRef.current = reply;
        speechSynthesizer.speak(reply, language);
        setPendingConfirmation(null);
        setDisambiguationCustomers([]);
        disambiguationCustomersRef.current = [];
        setVoiceState('success');
        setTimeout(() => setVoiceState('idle'), 1500);
        return;
      }
      if (pending) {
        setPendingConfirmation({
          ...pending,
          customer,
          customerName: customer.name,
        });
      } else {
        onNavigateTab('ledger');
        if (onSelectCustomer) {
          onSelectCustomer(customer.id);
        }
        const reply =
          language === 'en'
            ? `Opening ${customer.name}'s ledger record.`
            : language === 'pa'
            ? `${customer.name} ਦਾ ਖਾਤਾ ਖੋਲ੍ਹਿਆ ਗਿਆ`
            : `${customer.name} का खाता खोला गया`;
        lastSpokenTextRef.current = reply;
        speechSynthesizer.speak(reply, language);
        setVoiceState('success');
        setTimeout(() => setVoiceState('idle'), 1500);
      }
      setDisambiguationCustomers([]);
      disambiguationCustomersRef.current = [];
    },
    [pendingConfirmation, onNavigateTab, onSelectCustomer, t, language]
  );

  // Start listening specifically for the confirmation card reply ("Haan" / "Yes" or "Nahi" / "No")
  const startListeningForReply = useCallback(() => {
    if (sttProviderRef.current) {
      try {
        sttProviderRef.current.stopListening();
      } catch {}
    }
    setErrorMessage(null);
    setLiveTranscript('');
    setIsListening(true);
    setVoiceState('listening');

    const provider = createSTTProvider();
    sttProviderRef.current = provider;
    replySpeechStartedAtRef.current = 0;

    provider.startListening(
      {
        language,
        continuous: true,
        interimResults: true,
      },
      {
        onSpeechStart: (startedAtMs) => {
          replySpeechStartedAtRef.current = startedAtMs;
        },
        onResult: (res) => {
          if (res.speechStartedAtMs !== undefined) {
            replySpeechStartedAtRef.current = res.speechStartedAtMs;
          } else if (replySpeechStartedAtRef.current === 0) {
            replySpeechStartedAtRef.current = Date.now();
          }
          setLiveTranscript(res.transcript);
          const raw = res.transcript.trim().toLowerCase();

          // Rapid multi-lingual and multi-script yes/no intent detection
          const latinYes = /\b(haan|ha|haa|aaho|yes|yeah|yup|yep|sure|ok|okay|confirm|save|record|done|correct|right|likh\s*do|likh\s*deo|theek\s*hai|theek|save\s*kar\s*do|kar\s*do|bilkul|ho|sari|aam|avunu|haudu|athe)\b/i;
          const indicYes = /(?:^|\s|[^\p{L}\p{N}])(हाँ|हां|हाँजी|जी\s*हाँ|लिख\s*दो|लिख\s*लो|कर\s*दो|ठीक\s*है|सही\s*है|ਹਾਂ|ਹਾਂਜੀ|ਜੀ\s*ਹਾਂ|ਆਹੋ|ਲਿਖ\s*ਦਿਓ|ਠੀਕ\s*ਹੈ|ਹਾ|होय|हो|হ্যাঁ|ஆம்|சரி|అవును|సరే|ಹೌದು|ಅതെ)(?:$|\s|[^\p{L}\p{N}])/u;

          const latinNo = /\b(nahi|nahin|na|no|nope|nah|cancel|stop|ruko|discard|back|mat\s*likho|mat\s*karo|chhad\s*do|na\s*karo|don't|dont|nakko|venda|beda|illai|vaddu|wait)\b/i;
          const indicNo = /(?:^|\s|[^\p{L}\p{N}])(नहीं|ना|मत\s*लिखो|मत\s*करो|रद्द|कैंसिल|रुको|रहने\s*दो|ਨਹੀਂ|ਨਾ|ਨਾ\s*ਕਰੋ|ਛੱਡ\s*ਦਿਓ|ਰੱਦ|ਰੱਦ\s*ਕਰੋ|ਨਾਹੀ|नाही|नको|না|বাতিল|இல்லை|வேண்டாம்|వద్దు|కాదు|ಬೇಡ|വേണ്ട)(?:$|\s|[^\p{L}\p{N}])/u;

          const isYes = latinYes.test(raw) || indicYes.test(raw);
          const isNo = latinNo.test(raw) || indicNo.test(raw);

          // Fix 4: Never confirm on interim results; require final result + speech started after card appeared
          if (res.isFinal) {
            if (sttProviderRef.current) {
              try { sttProviderRef.current.stopListening(); } catch {}
            }
            setIsListening(false);
            if (
              isYes &&
              !isNo &&
              canCompleteByVoiceConfirm({
                isPillActive: true,
                isCardShowing: Boolean(pendingConfirmationRef.current),
                isFinalResult: true,
                speechStartedAtMs: replySpeechStartedAtRef.current,
                cardAppearedAtMs: cardAppearedAtRef.current,
                safetyTier: pendingConfirmationRef.current?.safetyTier,
              })
            ) {
              handleConfirmSave('voice');
            } else {
              // Route "nahi", "ruko", "nahi, 600", "200 aur jodo", etc. through processInput
              processInput(res.transcript);
            }
          }
        },
        onError: () => {
          setIsListening(false);
          setVoiceState('idle');
        },
        onStateChange: (state) => {
          if (state === 'idle') setIsListening(false);
        },
      }
    );
  }, [language, handleConfirmSave, handleCancelConfirmation]);

  return {
    isListening,
    voiceState,
    liveTranscript,
    errorMessage,
    consecutiveFailures,
    pendingConfirmation,
    disambiguationCustomers,
    disambiguationEntries,
    disambiguationEntryQuestion,
    startListening,
    startListeningForReply,
    stopListening,
    processInput,
    handleConfirmSave,
    handleCancelConfirmation,
    handleSelectDisambiguatedCustomer,
    openDiffConfirmationForEdit,
    handleSelectDisambiguatedEntry,
    cancelEntryDisambiguation: () => {
      setDisambiguationEntries([]);
      disambiguationEntriesRef.current = [];
      pendingEditRawTextRef.current = null;
    },
  };
}
