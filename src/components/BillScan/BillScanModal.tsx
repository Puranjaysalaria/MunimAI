import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../../i18n';
import {
  Camera,
  Image as ImageIcon,
  X,
  Sparkles,
  RotateCcw,
  Check,
  Building2,
  ChevronDown,
  Mic,
  Edit2,
} from 'lucide-react';
import { triggerHaptic, playAudioCue } from '../../lib/sound';
import { formatINR } from '../../lib/utils';
import { formatItemName, formatUnit } from '../../lib/nameTranslation';
import { createSTTProvider, STTProvider } from '../../stt';
import { speechSynthesizer } from '../../tts/speechSynthesizer';
import {
  parseBillPhotoWithGemini,
  ExtractedBillItem,
  BillOcrResult,
} from '../../lib/billOcrService';

interface BillScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPricesExtracted?: (items: ExtractedBillItem[]) => void;
}

function getFriendlyOcrErrorMessage(errorStr?: string, lang: string = 'hi'): string {
  if (!errorStr) {
    if (lang === 'pa') return 'ਕਿਰਪਾ ਕਰਕੇ ਚੰਗੀ ਰੋਸ਼ਨੀ ਵਿੱਚ ਬਿੱਲ ਦੀ ਸਾਫ਼ ਫ਼ੋਟੋ ਲਓ, ਤਾਂ ਜੋ ਸਮਾਨ ਅਤੇ ਰੇਟ ਸਾਫ਼ ਦਿਖਣ।';
    if (lang === 'en') return 'Please take a clear photo with good lighting, ensuring items and prices are clearly visible.';
    return 'कृपया अच्छी रोशनी में बिल की साफ़ फोटो लें, ताकि सामान और रेट साफ़ दिखाई दें।';
  }

  const lower = errorStr.toLowerCase();

  // If high demand, busy, 503, or server temporary capacity
  if (lower.includes('503') || lower.includes('busy') || lower.includes('demand') || lower.includes('unavailable')) {
    if (lang === 'pa') return 'AI ਸਰਵਰ ’ਤੇ ਇਸ ਵੇਲੇ ਵੱਧ ਲੋਡ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਕੁਝ ਸਕਿੰਟਾਂ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।';
    if (lang === 'en') return 'The AI bill scanner is temporarily busy with high demand. Please try again in a few moments.';
    return 'AI सर्वर पर अभी लोड अधिक है। कृपया कुछ सेकंड बाद फिर से फोटो खींचें।';
  }

  // If daily quota exceeded
  if (lower.includes('quota') || lower.includes('429') || lower.includes('exceeded')) {
    if (lang === 'pa') return 'ਅੱਜ ਦੀ ਬਿੱਲ ਸਕੈਨ ਸੀਮਾ ਪੂਰੀ ਹੋ ਗਈ ਹੈ (20 ਬਿੱਲ ਪ੍ਰਤੀ ਦਿਨ)। ਇਹ ਰਾਤ 12 ਵਜੇ ਰੀਸੈੱਟ ਹੋਵੇਗੀ।';
    if (lang === 'en') return 'Daily bill scan limit reached (20 scans per day). Quota resets at midnight.';
    return 'आज के बिल स्कैन की सीमा पूरी हो चुकी है (20 बिल प्रतिदिन)। यह रात 12 बजे रीसेट होगी।';
  }

  // If raw JSON or technical stack trace was returned
  if (errorStr.includes('{') || errorStr.includes('error') || errorStr.includes('returned')) {
    if (lang === 'pa') return 'ਬਿੱਲ ਸਕੈਨ ਕਰਨ ਵਿੱਚ ਦਿੱਕਤ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਸਾਫ਼ ਫ਼ੋਟੋ ਖਿੱਚੋ।';
    if (lang === 'en') return 'Receipt could not be read. Please retake a clear photo with good lighting.';
    return 'बिल स्कैन करने में समस्या आई। कृपया दोबारा साफ़ फोटो खींचें।';
  }

  return errorStr;
}

export const BillScanModal: React.FC<BillScanModalProps> = ({
  isOpen,
  onClose,
  onPricesExtracted,
}) => {
  const { t, language } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<BillOcrResult | null>(null);
  const [extractedItems, setExtractedItems] = useState<ExtractedBillItem[]>([]);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);

  // Voice discrepancy adjustment & spoken verification states
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState('');
  const sttProviderRef = useRef<STTProvider | null>(null);
  const extractedItemsRef = useRef<ExtractedBillItem[]>([]);
  extractedItemsRef.current = extractedItems;

  useEffect(() => {
    return () => {
      if (sttProviderRef.current) {
        try {
          sttProviderRef.current.stopListening();
        } catch {}
      }
    };
  }, []);

  const stopVoiceListening = useCallback(() => {
    if (sttProviderRef.current) {
      try {
        sttProviderRef.current.stopListening();
      } catch {}
    }
    setIsListening(false);
  }, []);

  const handleApplyUpdates = useCallback(() => {
    stopVoiceListening();
    const selected = extractedItemsRef.current.filter((i) => i.selected);
    if (selected.length === 0) return;

    triggerHaptic('success');
    playAudioCue('success');

    if (onPricesExtracted) {
      onPricesExtracted(selected);
    }
    const doneMsg =
      language === 'pa'
        ? `${selected.length} ਚੀਜ਼ਾਂ ਸਟਾਕ ਅਤੇ ਰੇਟ ਵਿੱਚ ਅਪਡੇਟ ਹੋ ਗਈਆਂ ਹਨ।`
        : language === 'en'
        ? `Updated ${selected.length} items in stock and prices.`
        : `${selected.length} सामान स्टॉक और दाम में अपडेट हो गए हैं।`;
    speechSynthesizer.speak(doneMsg, language);
    onClose();
  }, [stopVoiceListening, onPricesExtracted, onClose, language]);

  const handleVoiceInput = useCallback(
    (text: string, currentItems: ExtractedBillItem[]) => {
      if (!text) return;
      const lower = text.toLowerCase();

      // 1. Check for confirmation / "yes" intent
      const latinYes = /\b(haan|ha|haa|yes|yeah|yup|ok|okay|confirm|save|update|theek\s*hai|theek|sahi|sahi\s*hai|kar\s*do|karo|done|right|aaho|ho)\b/i;
      const indicYes = /(?:^|\s|[^\p{L}\p{N}])(हाँ|हां|हाँजी|जी\s*हाँ|लिख\s*दो|कर\s*दो|ठीक\s*है|सही\s*है|ਹਾਂ|ਹਾਂਜੀ|ਜੀ\s*ਹਾਂ|ਆਹੋ|ਠੀਕ\s*ਹੈ)(?:$|\s|[^\p{L}\p{N}])/u;

      if (latinYes.test(lower) || indicYes.test(text)) {
        handleApplyUpdates();
        return;
      }

      // 1b. Check for line removal ("remove sugar" / "chini hatao")
      const isRemoveLine = /\b(remove|hatao|hata\s*do|delete|nikalo|हटाओ|निकालो|ਹਟਾਓ)\b/iu.test(text);
      const itemsForRemove = currentItems.length > 0 ? currentItems : extractedItemsRef.current;
      if (isRemoveLine && itemsForRemove.length > 0) {
        const target = itemsForRemove.find((it) => {
          const n = it.name.toLowerCase();
          const loc = formatItemName(it.name, language).toLowerCase();
          return lower.includes(n) || lower.includes(loc);
        });
        if (target) {
          setExtractedItems((prev) => prev.map((it) => (it.id === target.id ? { ...it, selected: false } : it)));
          triggerHaptic('stop');
          playAudioCue('cancel');
          return;
        }
      }

      // 2. Check for item price discrepancy adjustment (e.g. "Butter biscuit 45", "Rusk 25 rupaye")
      const numMatches = text.match(/\b(\d+(?:\.\d+)?)\b/g);
      const itemsToSearch = currentItems.length > 0 ? currentItems : extractedItemsRef.current;
      if (numMatches && numMatches.length > 0 && itemsToSearch.length > 0) {
        const newPrice = Number(numMatches[numMatches.length - 1]);
        const query = text
          .replace(/\b(\d+(?:\.\d+)?)\b/g, '')
          .replace(
            /\b(rupaye|rupayee|rupees|rs|inr|daam|bhaav|price|rate|karo|kar|do|ka|to|change|set|update|badlo|kardo|packet|piece|litre|kg|kilo|cost|selling)\b/gi,
            ''
          )
          .trim()
          .toLowerCase();

        let bestMatch: ExtractedBillItem | null = null;
        let highestScore = 0;

        for (const it of itemsToSearch) {
          const itName = it.name.toLowerCase();
          let score = 0;

          if (query.length > 1 && (itName.includes(query) || query.includes(itName))) {
            score += 10;
          }

          const tokens = query.split(/\s+/).filter((t) => t.length > 1);
          for (const token of tokens) {
            if (itName.includes(token)) score += 3;
          }

          const localized = formatItemName(it.name, language).toLowerCase();
          if (query.length > 1 && (localized.includes(query) || query.includes(localized))) {
            score += 10;
          }
          for (const token of tokens) {
            if (localized.includes(token)) score += 3;
          }

          if (score > highestScore) {
            highestScore = score;
            bestMatch = it;
          }
        }

        if (bestMatch && newPrice > 0 && highestScore > 0) {
          setExtractedItems((prev) =>
            prev.map((it) => (it.id === bestMatch!.id ? { ...it, price: newPrice, selected: true } : it))
          );
          setHighlightedItemId(bestMatch.id);
          setTimeout(() => setHighlightedItemId(null), 3000);
          triggerHaptic('success');
          playAudioCue('success');

          const localizedName = formatItemName(bestMatch.name, language);
          const feedback =
            language === 'pa'
              ? `${localizedName} ਦਾ ਮੁੱਲ ₹${newPrice} ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ। ਅਪਡੇਟ ਕਰਨ ਲਈ 'ਹਾਂ' ਕਹੋ।`
              : language === 'en'
              ? `Updated ${localizedName} to ₹${newPrice}. Say 'Yes' to update prices.`
              : `${localizedName} का दाम ₹${newPrice} कर दिया गया है। अपडेट करने के लिए 'हाँ' कहें।`;

          setVoiceFeedback(feedback);
          speechSynthesizer.speak(feedback, language);
        }
      }
    },
    [language, handleApplyUpdates]
  );

  const startVoiceListening = useCallback(
    (itemsToMatch?: ExtractedBillItem[]) => {
      speechSynthesizer.stop();
      if (sttProviderRef.current) {
        try {
          sttProviderRef.current.stopListening();
        } catch {}
      }
      setIsListening(true);
      setVoiceTranscript('');

      const provider = createSTTProvider(undefined, {
        language,
        cloudSpeechEnabled: true,
      });
      sttProviderRef.current = provider;

      provider.startListening(
        { language, continuous: true, interimResults: true, isPillActive: true, maxDurationMs: 15_000 },
        {
          onResult: (result) => {
            const text = result.transcript.trim();
            setVoiceTranscript(text);
            if (result.isFinal) {
              handleVoiceInput(text, itemsToMatch || extractedItemsRef.current);
            }
          },
          onError: (err) => {
            console.warn('Bill scan STT error:', err);
            setIsListening(false);
          },
          onStateChange: (state) => {
            if (state === 'idle' || state === 'error') {
              setIsListening(false);
            }
          },
        }
      );
    },
    [language, handleVoiceInput]
  );

  if (!isOpen) return null;

  const handleCaptureClick = () => {
    triggerHaptic('start');
    playAudioCue('start');
    fileInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    triggerHaptic('light');
    galleryInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic('success');
      playAudioCue('success');
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setPreviewImage(dataUrl);
        setIsProcessing(true);
        setOcrResult(null);
        setExtractedItems([]);
        setVoiceFeedback(null);
        setVoiceTranscript('');

        try {
          const res = await parseBillPhotoWithGemini(dataUrl);
          setOcrResult(res);
          setExtractedItems(res.items);
          triggerHaptic('success');
          playAudioCue('success');

          if (res.items && res.items.length > 0) {
            const count = res.items.length;
            const promptMsg =
              language === 'pa'
                ? `ਬਿੱਲ ਤੋਂ ${count} ਚੀਜ਼ਾਂ ਦੇ ਮੁੱਲ ਮਿਲੇ ਹਨ। ਜੇ ਕੋਈ ਫ਼ਰਕ ਹੈ ਤਾਂ ਦੱਸੋ, ਜਾਂ ਮੁੱਲ ਅਪਡੇਟ ਕਰਨ ਲਈ 'ਹਾਂ' ਕਹੋ।`
                : language === 'en'
                ? `Found ${count} items from bill. Check if any price is different. Say 'Yes' to update prices, or speak to change any price.`
                : `बिल से ${count} सामान के दाम मिले हैं। अगर कोई अंतर है तो बताएं, या दाम अपडेट करने के लिए 'हाँ' कहें।`;

            setVoiceFeedback(promptMsg);
            speechSynthesizer.speak(promptMsg, language).then(() => {
              startVoiceListening(res.items);
            });
          }
        } catch (err) {
          console.error('Failed to parse bill photo:', err);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleItemSelection = (id: string) => {
    triggerHaptic('light');
    setExtractedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it))
    );
  };

  const togglePriceType = (id: string) => {
    triggerHaptic('light');
    setExtractedItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, priceType: it.priceType === 'cost' ? 'selling' : 'cost' }
          : it
      )
    );
  };

  const handleRetake = () => {
    stopVoiceListening();
    triggerHaptic('light');
    setPreviewImage(null);
    setOcrResult(null);
    setExtractedItems([]);
    setVoiceFeedback(null);
    setVoiceTranscript('');
    setShowPhotoPreview(false);
  };

  const handleModalClose = () => {
    stopVoiceListening();
    onClose();
  };

  const selectedCount = extractedItems.filter((i) => i.selected).length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="bg-surface w-full max-w-md sm:max-w-lg rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl flex flex-col border border-gray-100 max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800">
                <Camera className="w-5 h-5 stroke-[2.4]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {t.billScan.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {t.billScan.subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={handleModalClose}
              className="touch-target-64 p-2 text-slate-400 hover:text-slate-700 active:scale-95 rounded-full"
              aria-label={t.billScan.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Hidden HTML File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Content Area */}
          <div className="py-4 space-y-4">
            {/* 1. INITIAL STATE: No image captured yet */}
            {!previewImage && (
              <div className="space-y-5 py-2">
                <div className="border-2 border-dashed border-emerald-200 rounded-3xl p-6 text-center bg-emerald-50/30 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                    <Camera className="w-8 h-8 stroke-[2.2]" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-xs mx-auto">
                    {t.billScan.tipText}
                  </p>
                </div>

                {/* Primary Action: Very Large "Photo kheenchein" Button (>=64px tap target) */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCaptureClick}
                  className="touch-target-64 min-h-[64px] w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-primary to-emerald-700 hover:from-emerald-700 hover:to-primary text-white font-black text-base rounded-2xl shadow-lg flex items-center justify-center space-x-3 active:scale-95 border-2 border-emerald-500"
                >
                  <Camera className="w-6 h-6 stroke-[2.5]" />
                  <span className="tracking-wide text-lg">{t.billScan.takePhotoBtn}</span>
                </motion.button>

                {/* Secondary Action: Choose from Gallery (>=64px tap target) */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGalleryClick}
                  className="touch-target-64 min-h-[56px] w-full py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold text-xs rounded-2xl shadow-xs flex items-center justify-center space-x-2 border border-gray-200"
                >
                  <ImageIcon className="w-4 h-4 text-slate-600" />
                  <span>{t.billScan.uploadFromGallery}</span>
                </motion.button>
              </div>
            )}

            {/* 2. PROCESSING STATE: Scanning with AI */}
            {previewImage && isProcessing && (
              <div className="space-y-4 py-2">
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-950 flex flex-col items-center max-h-64">
                  <img
                    src={previewImage}
                    alt="Bill Preview"
                    className="max-h-60 w-auto object-contain opacity-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent animate-pulse" />
                  <div className="w-full bg-slate-900/95 text-white p-3 flex items-center justify-between text-xs font-bold border-t border-emerald-500/40">
                    <span className="flex items-center text-amber-300 animate-pulse">
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t.billScan.scanningBadge}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-1">
                  <p className="text-sm font-black text-emerald-900">
                    {t.billScan.scanningBadge}
                  </p>
                  <p className="text-xs text-emerald-700 font-medium">
                    Reading product names, quantities, and prices from receipt...
                  </p>
                </div>
              </div>
            )}

            {/* 3. EXTRACTED RESULTS STATE: Show items & allow update */}
            {previewImage && !isProcessing && extractedItems.length > 0 && (
              <div className="space-y-4">
                {/* Store Header & Bill Total Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md flex items-center justify-between">
                  <div className="flex items-center space-x-3 truncate mr-2">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Building2 className="w-5 h-5 stroke-[2.4]" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs text-slate-400 font-bold block">
                        {ocrResult?.storeName || 'Supermarket Receipt'}
                      </span>
                      <h4 className="text-base font-black text-white truncate">
                        {t.billScan.itemsDetected.replace('{count}', String(extractedItems.length))}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-[11px] text-slate-400 font-bold block">
                      {t.billScan.totalBill}
                    </span>
                    <span className="text-lg font-black text-emerald-400">
                      {formatINR(ocrResult?.totalAmount || 0)}
                    </span>
                  </div>
                </div>

                {/* Collapsible Photo Thumbnail */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                  <button
                    type="button"
                    onClick={() => setShowPhotoPreview(!showPhotoPreview)}
                    className="text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
                  >
                    <span>{showPhotoPreview ? 'Hide Bill Photo' : 'View Bill Photo'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPhotoPreview ? 'rotate-180' : ''}`} />
                  </button>
                  <span className="text-slate-400">{selectedCount} selected</span>
                </div>

                {showPhotoPreview && (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-slate-950 flex flex-col items-center max-h-48">
                    <img
                      src={previewImage}
                      alt="Receipt Photo"
                      className="max-h-48 w-auto object-contain"
                    />
                  </div>
                )}

                {/* Voice Discrepancy & Confirmation Bar */}
                <div
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    isListening
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/40'
                      : 'bg-emerald-50/50 border-emerald-200/90'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden flex-1 mr-2">
                    <button
                      type="button"
                      onClick={isListening ? stopVoiceListening : () => startVoiceListening()}
                      className={`touch-target-64 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        isListening
                          ? 'bg-rose-500 text-white animate-pulse shadow-md'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                      aria-label="Voice input for price discrepancy"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <div className="truncate">
                      <p className="text-xs font-black text-slate-800 truncate">
                        {isListening
                          ? voiceTranscript ||
                            (language === 'pa'
                              ? 'ਸੁਣ ਰਿਹਾ ਹੈ... ਮੁੱਲ ਬੋਲੋ ਜਾਂ "ਹਾਂ" ਕਹੋ'
                              : language === 'en'
                              ? 'Listening... speak price or say "Yes"'
                              : 'सुन रहे हैं... दाम बोलें या "हाँ" कहें')
                          : voiceFeedback ||
                            (language === 'pa'
                              ? 'ਕੋਈ ਫ਼ਰਕ ਹੈ ਤਾਂ ਮੁੱਲ ਬੋਲੋ, ਜਾਂ "ਹਾਂ" ਕਹੋ'
                              : language === 'en'
                              ? 'Speak price discrepancy, or say "Yes"'
                              : 'कोई अंतर है तो दाम बोलें, या "हाँ" कहें')}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium truncate">
                        {language === 'pa'
                          ? 'ਉਦਾਹਰਣ: "Butter biscuit 45" ਜਾਂ "ਹਾਂ"'
                          : language === 'en'
                          ? 'e.g. "Butter biscuit 45" or say "Yes"'
                          : 'उदाहरण: "Butter biscuit 45" या "हाँ"'}
                      </p>
                    </div>
                  </div>

                  {isListening && (
                    <span className="text-[10px] font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full flex-shrink-0 animate-pulse">
                      REC
                    </span>
                  )}
                </div>

                {/* Extracted Items List */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {extractedItems.map((item) => (
                    <motion.div
                      key={item.id}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => toggleItemSelection(item.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        highlightedItemId === item.id
                          ? 'border-amber-400 ring-2 ring-amber-400/80 bg-amber-50/70 shadow-md'
                          : item.selected
                          ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                          : 'bg-gray-50/70 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-3 overflow-hidden mr-2">
                        {/* Checkbox */}
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            item.selected
                              ? 'bg-emerald-600 text-white'
                              : 'border-2 border-gray-300 bg-white'
                          }`}
                        >
                          {item.selected && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>

                        {/* Name & Details */}
                        <div className="truncate">
                          <p className="text-xs font-black text-slate-900 truncate">
                            {formatItemName(item.name, language)}
                          </p>
                          <span className="text-[10px] font-bold text-slate-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {item.quantity} {formatUnit(item.unit, language)}
                          </span>
                        </div>
                      </div>

                      {/* Price & Cost/Selling Toggle */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePriceType(item.id);
                          }}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                            item.priceType === 'cost'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                          title="Click to toggle Cost or Selling price"
                        >
                          {item.priceType === 'cost'
                            ? t.billScan.priceTypeCost
                            : t.billScan.priceTypeSell}
                        </button>

                        {editingItemId === item.id ? (
                          <div
                            className="flex items-center space-x-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-xs font-bold text-slate-500">₹</span>
                            <input
                              type="number"
                              autoFocus
                              value={editPriceVal}
                              onChange={(e) => setEditPriceVal(e.target.value)}
                              onBlur={() => {
                                const val = parseFloat(editPriceVal);
                                if (!isNaN(val) && val > 0) {
                                  setExtractedItems((prev) =>
                                    prev.map((it) => (it.id === item.id ? { ...it, price: val } : it))
                                  );
                                }
                                setEditingItemId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = parseFloat(editPriceVal);
                                  if (!isNaN(val) && val > 0) {
                                    setExtractedItems((prev) =>
                                      prev.map((it) => (it.id === item.id ? { ...it, price: val } : it))
                                    );
                                  }
                                  setEditingItemId(null);
                                }
                              }}
                              className="w-16 px-1.5 py-0.5 text-xs font-black border border-emerald-500 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItemId(item.id);
                              setEditPriceVal(String(item.price));
                            }}
                            className="flex items-center space-x-1 hover:bg-emerald-100/60 p-1 rounded-lg transition-colors group"
                            title="Tap to change price"
                          >
                            <span className="text-sm font-black text-slate-900 group-hover:text-emerald-700">
                              {formatINR(item.price)}
                            </span>
                            <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Primary Button: Apply to Stock & Rates */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleApplyUpdates}
                  disabled={selectedCount === 0}
                  className="touch-target-64 min-h-[64px] w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-primary to-emerald-700 hover:from-emerald-700 hover:to-primary text-white font-black text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2.5 active:scale-95 border-2 border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span className="text-base tracking-wide">
                    {t.billScan.applyButton.replace('{count}', String(selectedCount))}
                  </span>
                </motion.button>

                {/* Secondary Button: Retake Photo */}
                <button
                  type="button"
                  onClick={handleRetake}
                  className="w-full py-2.5 text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center justify-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.billScan.retakeBtn}</span>
                </button>
              </div>
            )}

            {/* 4. NO ITEMS DETECTED OR ERROR FALLBACK STATE */}
            {previewImage && !isProcessing && extractedItems.length === 0 && (
              <div className="space-y-4 py-4 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
                  <RotateCcw className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-900">
                    {ocrResult?.error
                      ? language === 'pa'
                        ? 'ਸਕੈਨ ਪੂਰਾ ਨਹੀਂ ਹੋ ਸਕਿਆ'
                        : language === 'en'
                        ? 'Scan Could Not Be Completed'
                        : 'स्कैन पूरा नहीं हो सका'
                      : language === 'pa'
                      ? 'ਕੋਈ ਸਮਾਨ ਨਹੀਂ ਪੜ੍ਹਿਆ ਜਾ ਸਕਿਆ'
                      : language === 'en'
                      ? 'No items could be read'
                      : 'कोई सामान नहीं पढ़ा जा सका'}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto leading-relaxed">
                    {getFriendlyOcrErrorMessage(ocrResult?.error, language)}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRetake}
                  className="touch-target-64 min-h-[56px] w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md flex items-center justify-center space-x-2"
                >
                  <Camera className="w-5 h-5" />
                  <span>{t.billScan.retakeBtn}</span>
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
