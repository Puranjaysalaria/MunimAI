import React from 'react';
import { Shield, Lock, FileText, Trash2, X, CheckCircle } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs select-none">
      <div className="bg-surface w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-sheet max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-100 text-primary rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-app-text">गोपनीयता और डेटा सुरक्षा नीति</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 pt-4 text-xs text-app-text leading-relaxed">
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
            <p className="font-bold text-sm text-primary flex items-center">
              <Lock className="w-4 h-4 mr-1.5" />
              1. डेटा अलगाव और सुरक्षा (Data Isolation)
            </p>
            <p className="text-app-muted">
              आपकी दुकान का खाता सिर्फ आपका है। Postgres Row-Level Security (RLS) नीतियों द्वारा एक दुकान का डेटा किसी दूसरी दुकान को कभी नहीं दिखता।
            </p>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
            <p className="font-bold text-sm text-amber-900 flex items-center">
              <FileText className="w-4 h-4 mr-1.5" />
              2. ग्राहक की आवाज़ का सबूत (Audio Proof Consent)
            </p>
            <p className="text-app-muted">
              ग्राहक की सहमति के बिना कोई ऑडियो रिकॉर्ड नहीं होता। उधार दर्ज करने के बाद ग्राहक की स्पष्ट स्वीकृति ("हाँ, ₹... मेरे नाम लिख दो") केवल 5 सेकंड के लिए रिकॉर्ड की जाती है।
            </p>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
            <p className="font-bold text-sm text-emerald-800 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1.5" />
              3. प्राइवेट स्टोरेज और हस्ताक्षरित यूआरएल (Signed URLs)
            </p>
            <p className="text-app-muted">
              सभी सबूत प्राइवेट स्टोरेज बकेट में सुरक्षित रहते हैं। कोई भी ऑडियो क्लिप पब्लिक नहीं होती; इसे केवल दुकान मालिक टाइम-लिमिटेड हस्ताक्षरित लिंक (Signed URL) से सुन सकता है।
            </p>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
            <p className="font-bold text-sm text-owed flex items-center">
              <Trash2 className="w-4 h-4 mr-1.5" />
              4. रिकॉर्डिंग हटाने का अधिकार (Right to Delete)
            </p>
            <p className="text-app-muted">
              दुकानदार किसी भी समय ग्राहक की पुरानी ऑडियो क्लिप को खाते से हमेशा के लिए हटा सकता है।
            </p>
          </div>
        </div>

        <div className="pt-5">
          <button
            onClick={onClose}
            className="touch-target-64 w-full bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-md active:scale-95 flex items-center justify-center"
          >
            समझ गया
          </button>
        </div>
      </div>
    </div>
  );
};
