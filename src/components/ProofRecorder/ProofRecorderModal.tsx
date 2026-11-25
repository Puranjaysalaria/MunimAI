import React, { useState, useRef, useEffect } from 'react';
import { Customer, Transaction } from '../../types/schema';
import { useI18n } from '../../i18n';
import { formatINR } from '../../lib/utils';
import { storeCustomerProofClip } from '../../storage/proofStorage';
import { triggerHaptic, playAudioCue } from '../../lib/sound';
import { getLocalizedCustomerName } from '../../lib/nameTranslation';
import { createSTTProvider, STTProvider } from '../../stt';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  ShieldAlert,
  Volume2,
  Lock,
} from 'lucide-react';

interface ProofRecorderModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  customer: Customer | null;
  shopId: string;
  onSaveProof: (transactionId: string, proofClipPath: string, localUrl: string) => void;
  onClose: () => void;
}

export const ProofRecorderModal: React.FC<ProofRecorderModalProps> = ({
  isOpen,
  transaction,
  customer,
  shopId,
  onSaveProof,
  onClose,
}) => {
  const { t, language } = useI18n();

  const [state, setState] = useState<'ready' | 'recording' | 'review' | 'saving'>('ready');
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const countdownTimerRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const sttRef = useRef<STTProvider | null>(null);

  // Voice hands-free control for ProofRecorderModal ('ready' -> record, 'review' -> save/retry/skip)
  useEffect(() => {
    if (!isOpen || (state !== 'ready' && state !== 'review')) {
      if (sttRef.current) {
        try { sttRef.current.stopListening(); } catch {}
        sttRef.current = null;
      }
      return;
    }

    const provider = createSTTProvider();
    if (!provider.isSupported) return;
    sttRef.current = provider;

    provider.startListening(
      { language, continuous: true, interimResults: false },
      {
        onResult: (res) => {
          if (!res.isFinal) return;
          const lower = res.transcript.trim().toLowerCase();
          if (state === 'ready') {
            if (/\b(record|start|haan|ha|yes|ok|shuru|bulwayein)\b/i.test(lower) || /(रिकॉर्ड|शुरू|हाँ|ਹਾਂ)/.test(res.transcript)) {
              start5SecondRecording();
            } else if (/\b(skip|cancel|close|nahi|no)\b/i.test(lower) || /(नहीं|रद्द|छोड़ो|ਨਹੀਂ)/.test(res.transcript)) {
              stopRecordingCleanup();
              onClose();
            }
          } else if (state === 'review') {
            if (/\b(save|haan|ha|yes|ok|theek|confirm|submit)\b/i.test(lower) || /(सेव|हाँ|ठीक|ਹਾਂ)/.test(res.transcript)) {
              handleSave();
            } else if (/\b(retry|again|dobara)\b/i.test(lower) || /(दोबारा|फिर)/.test(res.transcript)) {
              setState('ready');
            } else if (/\b(skip|cancel|close|nahi|no)\b/i.test(lower) || /(नहीं|रद्द|छोड़ो|ਨਹੀਂ)/.test(res.transcript)) {
              stopRecordingCleanup();
              onClose();
            }
          }
        },
        onError: () => {},
        onStateChange: () => {},
      }
    );

    return () => {
      if (sttRef.current) {
        try { sttRef.current.stopListening(); } catch {}
        sttRef.current = null;
      }
    };
  }, [isOpen, state, language]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setState('ready');
      setSecondsRemaining(5);
      setAudioBlob(null);
      setAudioUrl(null);
      setIsPlaying(false);
    } else {
      stopRecordingCleanup();
    }
  }, [isOpen]);

  const stopRecordingCleanup = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  };

  const start5SecondRecording = async () => {
    try {
      triggerHaptic('start');
      playAudioCue('start');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setState('review');
        triggerHaptic('success');
        playAudioCue('success');
      };

      recorder.start();
      setState('recording');
      setSecondsRemaining(5);

      // 5-second countdown
      let remaining = 5;
      countdownTimerRef.current = window.setInterval(() => {
        remaining -= 1;
        setSecondsRemaining(remaining);
        if (remaining <= 0) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }
      }, 1000);
    } catch {
      triggerHaptic('error');
      alert(
        language === 'en'
          ? 'Could not access microphone. Please grant permission in browser settings.'
          : language === 'pa'
          ? 'ਮਾਈਕ੍ਰੋਫੋਨ ਚਾਲੂ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਇਜਾਜ਼ਤ ਦਿਓ।'
          : 'माइक्रोफोन चालू नहीं हो सका। कृपया अनुमति दें।'
      );
    }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(audioUrl);
      audioElementRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSave = async () => {
    if (!transaction || !audioBlob) return;

    setState('saving');
    triggerHaptic('start');

    try {
      const result = await storeCustomerProofClip({
        transactionId: transaction.id,
        shopId,
        audioBlob,
        durationMs: 5000,
      });

      onSaveProof(transaction.id, result.storagePath, result.playbackUrl);
      triggerHaptic('success');
      onClose();
    } catch {
      alert(
        language === 'en'
          ? 'Error saving audio proof.'
          : language === 'pa'
          ? 'ਸਬੂਤ ਸੇਵ ਕਰਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ।'
          : 'सबूत सुरक्षित करने में त्रुटि।'
      );
      setState('review');
    }
  };

  if (!isOpen || !transaction) return null;

  const targetAmount = transaction.amount;
  const targetCustomerName = getLocalizedCustomerName(customer?.name || t.confirmCard.customerLabel, language);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs select-none">
      <div className="bg-surface w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-sheet animate-slideUp border-t-4 border-amber-500">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-app-text">{t.proofModal.title}</h2>
              <p className="text-xs text-app-muted">
                {targetCustomerName} • {formatINR(targetAmount)} ({t.today.udhaarShare})
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopRecordingCleanup();
              onClose();
            }}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legal Consent Notice Box (Section 10 Requirement) */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 my-4">
          <div className="flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                {t.proofModal.consentBoxTitle}
              </p>
              <p className="text-sm font-black text-amber-900 mt-1 italic">
                {t.proofModal.consentNotice.replace('500', formatINR(targetAmount))}
              </p>
            </div>
          </div>
        </div>

        {/* State 1: Ready to record */}
        {state === 'ready' && (
          <div className="text-center py-4 space-y-4">
            <p className="text-xs text-app-muted">
              {t.proofModal.instruction}
            </p>

            <button
              onClick={start5SecondRecording}
              className="touch-target-64 w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-lg rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 border-2 border-amber-600"
            >
              <Mic className="w-6 h-6 text-zinc-950 animate-pulse" />
              <span>{t.proofModal.startRecordBtn}</span>
            </button>
          </div>
        )}

        {/* State 2: Active 5-second recording */}
        {state === 'recording' && (
          <div className="text-center py-6 space-y-4">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-red-100 animate-ping absolute" />
              <div className="w-24 h-24 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg relative z-10">
                <span className="text-4xl font-black">{secondsRemaining}s</span>
              </div>
            </div>

            <div>
              <p className="text-base font-bold text-red-600 animate-pulse">
                {t.proofModal.recording}
              </p>
              <p className="text-xs text-app-muted mt-1">
                {t.proofModal.instruction}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-red-600 h-full transition-all duration-1000"
                style={{ width: `${((5 - secondsRemaining) / 5) * 100}%` }}
              />
            </div>

            <button
              onClick={() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                  mediaRecorderRef.current.stop();
                }
              }}
              className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center justify-center mx-auto space-x-1 pt-2"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{t.proofModal.stopBtn}</span>
            </button>
          </div>
        )}

        {/* State 3: Review recording */}
        {state === 'review' && (
          <div className="py-3 space-y-4">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={togglePlayback}
                  className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-sm active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  )}
                </button>
                <div>
                  <p className="text-xs font-bold text-app-text">{t.proofModal.audioClipLabel}</p>
                  <p className="text-[11px] text-app-muted">
                    {isPlaying ? t.confirmCard.listeningStatus : t.proofModal.testListen}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  triggerHaptic('start');
                  setState('ready');
                }}
                className="p-2 text-gray-500 hover:text-gray-800 rounded-lg active:scale-95 text-xs font-bold flex items-center space-x-1"
                title="Record Again"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t.proofModal.retry}</span>
              </button>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  stopRecordingCleanup();
                  onClose();
                }}
                className="touch-target-64 border border-gray-300 font-bold text-app-muted rounded-xl hover:bg-gray-100 active:scale-95"
              >
                {t.proofModal.skipBtn}
              </button>

              <button
                onClick={handleSave}
                className="touch-target-64 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-md active:scale-95 flex items-center justify-center space-x-2"
              >
                <Check className="w-5 h-5 text-accent stroke-[3]" />
                <span>{t.proofModal.save}</span>
              </button>
            </div>
          </div>
        )}

        {/* State 4: Saving */}
        {state === 'saving' && (
          <div className="text-center py-8 space-y-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-app-text">{t.proofModal.savingNotice}</p>
            <p className="text-xs text-app-muted">{t.proofModal.savingSubNotice}</p>
          </div>
        )}

        <div className="flex items-center justify-center space-x-1 text-[11px] text-gray-400 mt-2">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span>{t.proofModal.privateSecureNotice}</span>
        </div>
      </div>
    </div>
  );
};
