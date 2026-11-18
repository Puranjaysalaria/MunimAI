import { useState, useRef, useCallback } from 'react';
import { Customer, Item, Transaction } from '../types/schema';
import { createSTTProvider, STTProvider } from '../stt';
import { parseSpeech } from '../parser';
import { PendingConfirmation } from '../components/ConfirmationCard/ConfirmationCard';
import { speechSynthesizer } from '../tts/speechSynthesizer';
import { playAudioCue, triggerHaptic } from '../lib/sound';
import { useI18n } from '../i18n';

interface UseVoiceControllerProps {
  customers: Customer[];
  items: Item[];
  isOnline: boolean;
  onSaveTransaction: (tx: Omit<Transaction, 'id' | 'shop_id' | 'created_at'>) => Transaction;
  onUndoLast: () => { success: boolean; message: string };
  onNavigateTab: (tab: 'home' | 'ledger' | 'stock' | 'today') => void;
}

export function useVoiceController({
  customers,
  items,
  isOnline,
  onSaveTransaction,
  onUndoLast,
  onNavigateTab,
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
        });

        // 1. Control Intents
        if (result.intent === 'confirm_yes') {
          if (pendingConfirmation) {
            handleConfirmSave();
          } else {
            speechSynthesizer.speak('हाँ, बताइए क्या लिखना है?', language);
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
          speechSynthesizer.speak('आज की कुल कमाई और हिसाब दिखाया जा रहा है', language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'ordering') {
          setVoiceState('success');
          onNavigateTab('stock');
          speechSynthesizer.speak('सप्लायर के लिए सामान की सूची खोली जा रही है', language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'recovery') {
          setVoiceState('success');
          onNavigateTab('ledger');
          speechSynthesizer.speak('1000 से ज्यादा बाकी वाले ग्राहकों की लिस्ट', language);
          setTimeout(() => setVoiceState('idle'), 1500);
          return;
        }

        if (result.intent === 'stock') {
          setVoiceState('success');
          onNavigateTab('stock');
          const matchedItem = result.matchedItem;
          if (matchedItem) {
            const stockReply = `${matchedItem.name} का स्टॉक ${matchedItem.current_stock} ${matchedItem.unit} बाकी है, जो लगभग ${matchedItem.days_stock_left || 5} दिन चलेगा।`;
            speechSynthesizer.speak(stockReply, language);
          } else {
            speechSynthesizer.speak('दुकान का स्टॉक खोला जा रहा है', language);
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
          speechSynthesizer.speak(result.spokenReply || 'कौनसा ग्राहक?', language);
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
    [customers, items, isOnline, pendingConfirmation, language, t, onUndoLast, onNavigateTab]
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
          setVoiceState('error');
          if (err.code === 'not-allowed') {
            setErrorMessage(t.voice.micPermissionDenied);
          } else {
            setErrorMessage(t.voice.noiseError);
          }
          triggerHaptic('error');
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
      language === 'pa'
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
    triggerHaptic('stop');
    playAudioCue('cancel');
    setPendingConfirmation(null);
    setDisambiguationCustomers([]);
    setVoiceState('idle');
    setLiveTranscript('');
    speechSynthesizer.speak('रद्द कर दिया गया है', language);
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

  return {
    isListening,
    voiceState,
    liveTranscript,
    errorMessage,
    consecutiveFailures,
    pendingConfirmation,
    disambiguationCustomers,
    startListening,
    stopListening,
    processInput,
    handleConfirmSave,
    handleCancelConfirmation,
    handleSelectDisambiguatedCustomer,
  };
}
