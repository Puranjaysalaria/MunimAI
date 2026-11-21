import React, { useRef, useState } from 'react';
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
} from 'lucide-react';
import { triggerHaptic, playAudioCue } from '../../lib/sound';
import { formatINR } from '../../lib/utils';
import { formatItemName, formatUnit } from '../../lib/nameTranslation';
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

        try {
          const res = await parseBillPhotoWithGemini(dataUrl);
          setOcrResult(res);
          setExtractedItems(res.items);
          triggerHaptic('success');
          playAudioCue('success');
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

  const handleApplyUpdates = () => {
    const selected = extractedItems.filter((i) => i.selected);
    if (selected.length === 0) return;

    triggerHaptic('success');
    playAudioCue('success');

    if (onPricesExtracted) {
      onPricesExtracted(selected);
    }
    onClose();
  };

  const handleRetake = () => {
    triggerHaptic('light');
    setPreviewImage(null);
    setOcrResult(null);
    setExtractedItems([]);
    setShowPhotoPreview(false);
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
              onClick={onClose}
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

                {/* Extracted Items List */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {extractedItems.map((item) => (
                    <motion.div
                      key={item.id}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => toggleItemSelection(item.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        item.selected
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

                        <span className="text-sm font-black text-slate-900">
                          {formatINR(item.price)}
                        </span>
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

            {/* 4. NO ITEMS DETECTED FALLBACK STATE */}
            {previewImage && !isProcessing && extractedItems.length === 0 && (
              <div className="space-y-4 py-4 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
                  <RotateCcw className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-900">
                    No items could be read
                  </h4>
                  <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                    Please take another clear photo with good lighting, or choose a clearer receipt image.
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
