import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../../i18n';
import { Camera, Image as ImageIcon, X, CheckCircle, Sparkles } from 'lucide-react';
import { triggerHaptic, playAudioCue } from '../../lib/sound';

interface BillScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPricesExtracted?: (items: Array<{ name: string; price: number; unit?: string }>) => void;
}

export const BillScanModal: React.FC<BillScanModalProps> = ({
  isOpen,
  onClose,
  onPricesExtracted,
}) => {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
      reader.onload = () => {
        setPreviewImage(reader.result as string);
        setIsProcessing(true);

        // Simulate intelligent local OCR extraction
        setTimeout(() => {
          setIsProcessing(false);
          if (onPricesExtracted) {
            onPricesExtracted([
              { name: 'Doodh', price: 66, unit: 'litre' },
              { name: 'Chini', price: 45, unit: 'kilo' },
            ]);
          }
        }, 1200);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="bg-surface w-full max-w-md sm:max-w-lg rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl flex flex-col border border-gray-100 max-h-[90vh] overflow-y-auto"
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

          {/* Hidden HTML File Inputs triggered strictly on user tap */}
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
          <div className="py-6 space-y-5">
            {previewImage ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-950 flex flex-col items-center">
                <img
                  src={previewImage}
                  alt="Bill Preview"
                  className="max-h-60 w-auto object-contain"
                />
                <div className="w-full bg-slate-900/90 text-white p-2.5 flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center text-emerald-400">
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    {t.billScan.photoCaptured}
                  </span>
                  {isProcessing && (
                    <span className="flex items-center text-amber-400 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      Scanning...
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-emerald-200 rounded-3xl p-6 text-center bg-emerald-50/30 space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                  <Camera className="w-8 h-8 stroke-[2.2]" />
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-xs mx-auto">
                  {t.billScan.tipText}
                </p>
              </div>
            )}

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
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
