import React from 'react';
import { ShieldCheck, Mic, Volume2, X } from 'lucide-react';
import { LanguageCode } from '../../i18n/types';

interface CloudSpeechConsentModalProps {
  isOpen: boolean;
  language: LanguageCode;
  onAccept: () => void;
  onDecline: () => void;
}

const CONSENT_COPY: Record<
  string,
  {
    title: string;
    whatSent: string;
    toWhom: string;
    proofNote: string;
    allowBtn: string;
    deviceOnlyBtn: string;
  }
> = {
  hi: {
    title: 'क्लाउड वॉइस सहायता की अनुमति',
    whatSent: 'क्या भेजा जाता है: आपकी छोटी वॉइस कमांड क्लिप (अधिकतम 15 सेकंड) और जवाब का टेक्स्ट।',
    toWhom: 'किसे भेजा जाता है: सटीक भारतीय भाषा पहचान और बोलने के लिए Gnani / Timbre क्लाउड वॉइस सेवा।',
    proofNote: 'ग्राहक की वॉइस प्रूफ़ रिकॉर्डिंग हमेशा आपके फ़ोन और निजी दुकान स्टोरेज में ही रहती है।',
    allowBtn: 'क्लाउड वॉइस चालू करें',
    deviceOnlyBtn: 'सिर्फ़ फ़ोन की आवाज़ उपयोग करें',
  },
  pa: {
    title: 'ਕਲਾਊਡ ਵੌਇਸ ਸਹਾਇਤਾ ਦੀ ਇਜਾਜ਼ਤ',
    whatSent: 'ਕੀ ਭੇਜਿਆ ਜਾਂਦਾ ਹੈ: ਤੁਹਾਡੀ ਛੋਟੀ ਵੌਇਸ ਕਮਾਂਡ ਕਲਿੱਪ (ਵੱਧ ਤੋਂ ਵੱਧ 15 ਸਕਿੰਟ) ਅਤੇ ਜਵਾਬ ਦਾ ਟੈਕਸਟ।',
    toWhom: 'ਕਿਸ ਨੂੰ: ਸਹੀ ਭਾਰਤੀ ਭਾਸ਼ਾ ਪਛਾਣ ਲਈ Gnani / Timbre ਕਲਾਊਡ ਸੇਵਾ।',
    proofNote: 'ਗਾਹਕ ਦੀ ਵੌਇਸ ਪਰੂਫ਼ ਰਿਕਾਰਡਿੰਗ ਹਮੇਸ਼ਾ ਤੁਹਾਡੇ ਫ਼ੋਨ ਅਤੇ ਨਿੱਜੀ ਸਟੋਰੇਜ ਵਿੱਚ ਰਹਿੰਦੀ ਹੈ।',
    allowBtn: 'ਕਲਾਊਡ ਵੌਇਸ ਚਾਲੂ ਕਰੋ',
    deviceOnlyBtn: 'ਸਿਰਫ਼ ਫ਼ੋਨ ਦੀ ਆਵਾਜ਼ ਵਰਤੋ',
  },
  en: {
    title: 'Cloud Speech Permission',
    whatSent: 'What is sent: Short voice command clips (up to 15s, silence trimmed) and reply text for speech.',
    toWhom: 'Sent to: Gnani / Timbre cloud speech service for accurate Indian-language recognition and voice.',
    proofNote: 'Customer voice proof recordings stay private in your local and shop storage — never sent to Gnani.',
    allowBtn: 'Allow Cloud Speech',
    deviceOnlyBtn: 'Use Device Voice Only',
  },
};

export const CloudSpeechConsentModal: React.FC<CloudSpeechConsentModalProps> = ({
  isOpen,
  language,
  onAccept,
  onDecline,
}) => {
  if (!isOpen) return null;
  const copy = CONSENT_COPY[language] || CONSENT_COPY.en;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
      <div className="bg-surface w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-sheet space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-extrabold text-app-text">{copy.title}</h3>
          </div>
          <button
            type="button"
            onClick={onDecline}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 text-sm text-app-text bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="flex items-start space-x-2">
            <Mic className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>{copy.whatSent}</span>
          </p>
          <p className="flex items-start space-x-2">
            <Volume2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>{copy.toWhom}</span>
          </p>
          <p className="text-xs text-emerald-700 font-semibold pt-1 border-t border-slate-200">
            {copy.proofNote}
          </p>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onAccept}
            className="touch-target-64 w-full bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-md transition-all"
          >
            {copy.allowBtn}
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="touch-target-64 w-full border border-gray-300 text-app-text hover:bg-gray-50 font-bold rounded-xl transition-all"
          >
            {copy.deviceOnlyBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
