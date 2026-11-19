import { useState, useRef, useCallback } from 'react';
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
}: UseVoiceControllerProps) {
  const { language, t } = useI18n();

  const [isListening, setIsListening] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'thinking' | 'success' | 'error'>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [disambiguationCustomers, setDisambiguationCustomers] = useState<Customer[]>([]);

  const sttProviderRef = useRef<STTProvider | null>(null);

  // Stop listening
  const stopListening = useCallback(() => {
    if (sttProviderRef.current) {
      sttProviderRef.current.stopListening();
    }
    setIsListening(false);
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
    ]
  );

  // Start voice listening
  const startListening = useCallback(() => {
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
          if (state === 'idle') setIsListening(false);
        },
      }
    );
  }, [language, stopListening, processInput, t]);

  // Confirm and save the pending transaction
  const handleConfirmSave = useCallback(() => {
    if (!pendingConfirmation) return;

    if (sttProviderRef.current) {
      sttProviderRef.current.stopListening();
    }
    setIsListening(false);

    triggerHaptic('success');
    playAudioCue('success');

    const txType =
      pendingConfirmation.intent === 'credit'
        ? 'credit'
        : pendingConfirmation.intent === 'payment'
        ? 'payment'
        : pendingConfirmation.intent === 'expense'
        ? 'expense'
        : 'sale';

    // Construct items array
    const txItems = pendingConfirmation.itemName
      ? [
          {
            name: pendingConfirmation.itemName,
            quantity: pendingConfirmation.quantity || 1,
            unit: pendingConfirmation.unit || 'kilo',
            price: pendingConfirmation.amount,
          },
        ]
      : [];

    onSaveTransaction({
      type: txType,
      amount: pendingConfirmation.amount,
      customer_id: pendingConfirmation.customer?.id || null,
      items: txItems,
      confirmed_by_voice: true,
      voice_transcript: pendingConfirmation.rawText,
    });

    const successVoice =
      language === 'en'
        ? `Transaction of ₹${pendingConfirmation.amount} recorded.`
        : language === 'pa'
        ? 'ਹਾਂ ਜੀ, ਸੌਦਾ ਲਿਖ ਦਿੱਤਾ ਗਿਆ ਹੈ'
        : `हाँ, ₹${pendingConfirmation.amount} का लेन-देन लिख दिया गया है`;

    speechSynthesizer.speak(successVoice, language);

    setPendingConfirmation(null);
    setDisambiguationCustomers([]);
    setVoiceState('success');
    setTimeout(() => {
      setVoiceState('idle');
      setLiveTranscript('');
    }, 1200);
  }, [pendingConfirmation, onSaveTransaction, language]);

  // Cancel pending confirmation
  const handleCancelConfirmation = useCallback(() => {
    if (sttProviderRef.current) {
      sttProviderRef.current.stopListening();
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
        continuous: false,
        interimResults: true,
      },
      {
        onResult: (res) => {
          setLiveTranscript(res.transcript);
          const raw = res.transcript.trim().toLowerCase();

          // Rapid intent detection even on interim results for snappy, instant response
          const isYes = /\b(haan|ha|haa|aaho|yes|yeah|yup|ok|okay|confirm|save|record|done|correct|right|likh\s*do|likh\s*deo|theek\s*hai|theek|save\s*kar\s*do|kar\s*do|bilkul|ho|sari|aam|avunu|haudu|athe)\b/i.test(raw);
          const isNo = /\b(nahi|nahin|na|no|nope|cancel|stop|ruko|discard|back|mat\s*likho|mat\s*karo|chhad\s*do|na\s*karo|don't|dont|nakko|venda|beda|illai|vaddu)\b/i.test(raw);

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
            stopListening();
            processInput(res.transcript);
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
  }, [language, stopListening, handleConfirmSave, handleCancelConfirmation, processInput]);

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
