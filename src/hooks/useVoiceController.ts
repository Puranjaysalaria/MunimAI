import { useState, useRef, useCallback, useEffect } from 'react';
import { Customer, Item, Transaction } from '../types/schema';
import { createSTTProvider, STTProvider } from '../stt';
import { parseSpeech } from '../parser';
import { PendingConfirmation } from '../components/ConfirmationCard/ConfirmationCard';
import { speechSynthesizer } from '../tts/speechSynthesizer';
import { playAudioCue, triggerHaptic } from '../lib/sound';
import { useI18n } from '../i18n';
import {
  compute14DayStockAnalysis,
  generateStockVoiceReply,
  computeDailySummary,
  generateDailySummaryVoice,
} from '../lib/stockAnalytics';

interface UseVoiceControllerProps {
  customers: Customer[];
  items: Item[];
  transactions: Transaction[];
  isOnline: boolean;
  onSaveTransaction: (tx: Omit<Transaction, 'id' | 'shop_id' | 'created_at'>) => Transaction;
  onUndoLast: () => { success: boolean; message: string };
  onNavigateTab: (tab: 'home' | 'ledger' | 'stock' | 'today') => void;
  onOpenSupplierOrders?: () => void;
  onOpenDailySummary?: () => void;
  onOpenRecovery?: (threshold: number) => void;
  onOpenReminderSettings?: () => void;
  onOpenBillScan?: () => void;
  onUpdateItemPrice?: (itemNameOrId: string, updates: { selling_price?: number; cost_price?: number }) => { success: boolean; previousItem?: Item; updatedItem?: Item };
  onPriceActionConfirmed?: (action: { item: Item; priceType: 'selling' | 'cost'; oldPrice: number; newPrice: number; unit: string }) => void;
  onSelectCustomer?: (customerId: string) => void;
  onCloseModals?: () => void;
  onPlayProofClip?: (clipPath?: string) => void;
}

export function useVoiceController({
  customers,
  items,
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

  const sttProviderRef = useRef<STTProvider | null>(null);
  const pendingConfirmationRef = useRef<PendingConfirmation | null>(null);

  useEffect(() => {
    pendingConfirmationRef.current = pendingConfirmation;
  }, [pendingConfirmation]);

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
        const result = await parseSpeech(text, {
          customers,
          items,
          isOnline,
          language,
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
          const orderVoice =
            language === 'en'
              ? 'Supplier order list prepared based on 14-day consumption.'
              : language === 'pa'
              ? 'ਸਪਲਾਇਰ ਆਰਡਰ ਸੂਚੀ ਤਿਆਰ ਹੈ। 14 ਦਿਨਾਂ ਦੀ ਵਿਕਰੀ ਅਨੁਸਾਰ ਆਰਡਰ ਬਣਾਇਆ ਗਿਆ ਹੈ।'
              : 'सप्लायर आर्डर लिस्ट तैयार है। 14 दिनों की बिक्री के अनुसार आर्डर बनाया गया है।';
          speechSynthesizer.speak(orderVoice, language);
          if (onOpenSupplierOrders) {
            onOpenSupplierOrders();
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
          const reply = t.voiceCommands.lowStockReply;
          lastSpokenTextRef.current = reply;
          speechSynthesizer.speak(reply, language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'order_item' || result.intent === 'build_order_list') {
          setVoiceState('success');
          onNavigateTab('stock');
          if (onOpenSupplierOrders) onOpenSupplierOrders();
          const reply = t.voiceCommands.orderPreparedReply;
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
          setVoiceState('success');
          onNavigateTab('ledger');
          if (result.matchedCustomer && onSelectCustomer) {
            onSelectCustomer(result.matchedCustomer.id);
          }
          const reply = t.voiceCommands.ledgerOpenedReply;
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

        // Price Action Intents (set_selling_price / set_cost_price)
        if (result.intent === 'set_selling_price' || result.intent === 'set_cost_price') {
          const priceType: 'selling' | 'cost' = result.intent === 'set_cost_price' ? 'cost' : 'selling';
          const matchedItem = result.matchedItem || items.find((i) => i.name.toLowerCase() === (result.item || '').toLowerCase());
          const oldPrice = result.oldPrice !== undefined && result.oldPrice !== null
            ? result.oldPrice
            : matchedItem
            ? (priceType === 'cost' ? matchedItem.cost_price : matchedItem.selling_price)
            : null;

          setPendingConfirmation({
            intent: result.intent,
            amount: result.amount || 0,
            item: matchedItem || null,
            itemName: matchedItem?.name || result.item || 'Item',
            unit: result.unit || matchedItem?.unit || 'unit',
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

  // Confirm and save the pending transaction
  const handleConfirmSave = useCallback(() => {
    const pending = pendingConfirmationRef.current;
    if (!pending) return;

    if (sttProviderRef.current) {
      try {
        sttProviderRef.current.stopListening();
      } catch {}
    }
    setIsListening(false);

    triggerHaptic('success');
    playAudioCue('success');

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
  }, [onSaveTransaction, language, t, onUpdateItemPrice, onPriceActionConfirmed]);

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
      if (pendingConfirmation) {
        setPendingConfirmation({
          ...pendingConfirmation,
          customer,
          customerName: customer.name,
        });
      }
      setDisambiguationCustomers([]);
    },
    [pendingConfirmation]
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

    provider.startListening(
      {
        language,
        continuous: true,
        interimResults: true,
      },
      {
        onResult: (res) => {
          setLiveTranscript(res.transcript);
          const raw = res.transcript.trim().toLowerCase();

          // Rapid multi-lingual and multi-script yes/no intent detection
          const latinYes = /\b(haan|ha|haa|aaho|yes|yeah|yup|yep|sure|ok|okay|confirm|save|record|done|correct|right|likh\s*do|likh\s*deo|theek\s*hai|theek|save\s*kar\s*do|kar\s*do|bilkul|ho|sari|aam|avunu|haudu|athe)\b/i;
          const indicYes = /(?:^|\s|[^\p{L}\p{N}])(हाँ|हां|हाँजी|जी\s*हाँ|लिख\s*दो|लिख\s*लो|कर\s*दो|ठीक\s*है|सही\s*है|ਹਾਂ|ਹਾਂਜੀ|ਜੀ\s*ਹਾਂ|ਆਹੋ|ਲਿਖ\s*ਦਿਓ|ਠੀਕ\s*ਹੈ|ਹਾ|होय|हो|হ্যাঁ|ஆம்|சரி|అవును|సరే|ಹೌದು|ಅതെ)(?:$|\s|[^\p{L}\p{N}])/u;

          const latinNo = /\b(nahi|nahin|na|no|nope|nah|cancel|stop|ruko|discard|back|mat\s*likho|mat\s*karo|chhad\s*do|na\s*karo|don't|dont|nakko|venda|beda|illai|vaddu|wait)\b/i;
          const indicNo = /(?:^|\s|[^\p{L}\p{N}])(नहीं|ना|मत\s*लिखो|मत\s*करो|रद्द|कैंसिल|रुको|रहने\s*दो|ਨਹੀਂ|ਨਾ|ਨਾ\s*ਕਰੋ|ਛੱਡ\s*ਦਿਓ|ਰੱਦ|ਰੱਦ\s*ਕਰੋ|ਨਾਹੀ|नाही|नको|না|বাতিল|இல்லை|வேண்டாம்|వద్దు|కాదు|ಬೇಡ|വേണ്ട)(?:$|\s|[^\p{L}\p{N}])/u;

          const isYes = latinYes.test(raw) || indicYes.test(raw);
          const isNo = latinNo.test(raw) || indicNo.test(raw);

          if (isYes && !isNo) {
            if (sttProviderRef.current) {
              try { sttProviderRef.current.stopListening(); } catch {}
            }
            setIsListening(false);
            handleConfirmSave();
            return;
          }
          if (isNo) {
            if (sttProviderRef.current) {
              try { sttProviderRef.current.stopListening(); } catch {}
            }
            setIsListening(false);
            handleCancelConfirmation();
            return;
          }

          if (res.isFinal) {
            if (isYes && !isNo) {
              handleConfirmSave();
            } else if (isNo) {
              handleCancelConfirmation();
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
    startListening,
    startListeningForReply,
    stopListening,
    processInput,
    handleConfirmSave,
    handleCancelConfirmation,
    handleSelectDisambiguatedCustomer,
  };
}
