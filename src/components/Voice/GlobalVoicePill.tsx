import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../../i18n';
import { Mic, Check, AlertCircle, Loader2 } from 'lucide-react';
import { triggerHaptic, playAudioCue } from '../../lib/sound';

interface GlobalVoicePillProps {
  isListening: boolean;
  voiceState: 'idle' | 'listening' | 'thinking' | 'success' | 'error';
  liveTranscript: string;
  errorMessage: string | null;
  onStartListening: () => void;
  onStopListening: () => void;
  visible: boolean;
}

export const GlobalVoicePill: React.FC<GlobalVoicePillProps> = ({
  isListening,
  voiceState,
  liveTranscript,
  errorMessage,
  onStartListening,
  onStopListening,
  visible,
}) => {
  const { t } = useI18n();

  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdTriggeredRef = useRef(false);

  // Check prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cleanup hold timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  const handlePointerDown = () => {
    holdTriggeredRef.current = false;
    if (isListening || voiceState === 'listening') return;

    holdTimerRef.current = setTimeout(() => {
      holdTriggeredRef.current = true;
      setIsHolding(true);
      triggerHaptic('start');
      playAudioCue('start');
      onStartListening();
    }, 220);
  };

  const handlePointerUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (holdTriggeredRef.current) {
      // Completed hold-to-talk gesture
      setIsHolding(false);
      holdTriggeredRef.current = false;
      triggerHaptic('stop');
      onStopListening();
    } else {
      // Normal tap toggle
      handleClickToggle();
    }
  };

  const handleClickToggle = () => {
    if (isListening || voiceState === 'listening') {
      triggerHaptic('stop');
      playAudioCue('cancel');
      onStopListening();
    } else {
      triggerHaptic('start');
      playAudioCue('start');
      onStartListening();
    }
  };

  // Localized status labels from i18n
  const getStatusLabel = () => {
    if (voiceState === 'listening') {
      return t.voice.listening;
    }
    if (voiceState === 'thinking') {
      return t.voice.thinking;
    }
    if (voiceState === 'success') {
      return t.voice.success;
    }
    if (voiceState === 'error') {
      return errorMessage || t.voice.retry;
    }
    return t.voice.tapToSpeak;
  };

  const isExpanded = voiceState === 'listening' || voiceState === 'thinking';

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-none flex flex-col items-center"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Live Transcript Line floating above pill when active */}
      <AnimatePresence>
        {(liveTranscript || isExpanded) && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mb-2 max-w-[85vw] sm:max-w-md bg-slate-950/90 text-white px-3.5 py-1.5 rounded-2xl shadow-dock border border-slate-700/80 backdrop-blur-md pointer-events-auto text-center"
          >
            <p className="text-xs font-semibold text-slate-200 line-clamp-2">
              {liveTranscript ? `"${liveTranscript}"` : getStatusLabel()}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wispr Flow Expanding Pill Container */}
      <motion.div
        layout
        animate={{ scale: isHolding ? 1.05 : 1 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { type: 'spring', damping: 25, stiffness: 340 }
        }
        className="pointer-events-auto"
      >
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label={getStatusLabel()}
          className={`touch-target-64 relative flex items-center justify-center transition-all duration-200 rounded-full border shadow-sheet ${
            voiceState === 'listening'
              ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white border-emerald-300 ring-4 ring-emerald-400/40 px-5 py-2.5 min-w-[190px] h-[52px]'
              : voiceState === 'thinking'
              ? 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white border-indigo-400 ring-2 ring-indigo-400/30 px-5 py-2.5 min-w-[190px] h-[52px]'
              : voiceState === 'success'
              ? 'bg-emerald-600 text-white border-emerald-400 px-4 py-2 min-w-[140px] h-[48px]'
              : voiceState === 'error'
              ? 'bg-rose-600 text-white border-rose-400 px-4 py-2 min-w-[140px] h-[48px]'
              : 'bg-slate-900/95 text-slate-100 hover:text-white hover:bg-slate-900 border-slate-700/90 hover:border-slate-500 px-4 py-2 min-w-[130px] h-[46px] backdrop-blur-md'
          }`}
        >
          {/* Active Listening Waveform Animation */}
          {voiceState === 'listening' ? (
            <div className="flex items-center space-x-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>

              {/* Animated audio bars */}
              <div className="flex items-center space-x-1 h-5 px-1">
                {[12, 22, 16, 26, 18, 14].map((maxH, i) => (
                  <span
                    key={i}
                    style={{
                      height: `${maxH}px`,
                      animation: prefersReducedMotion
                        ? 'none'
                        : `live-soundbar 0.65s ease-in-out infinite alternate`,
                      animationDelay: `${(i * 0.1).toFixed(2)}s`,
                    }}
                    className="w-1 rounded-full bg-white shadow-xs inline-block"
                  />
                ))}
              </div>

              <span className="text-xs font-black tracking-wide">
                {getStatusLabel()}
              </span>
            </div>
          ) : voiceState === 'thinking' ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
              <span className="text-xs font-black tracking-wide">
                {getStatusLabel()}
              </span>
            </div>
          ) : voiceState === 'success' ? (
            <div className="flex items-center space-x-1.5">
              <Check className="w-4 h-4 stroke-[3]" />
              <span className="text-xs font-black">{getStatusLabel()}</span>
            </div>
          ) : voiceState === 'error' ? (
            <div className="flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 stroke-[2.5]" />
              <span className="text-xs font-black">{getStatusLabel()}</span>
            </div>
          ) : (
            /* Idle Pill: Minimalist floating pill */
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Mic className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-xs font-bold text-slate-200">
                {getStatusLabel()}
              </span>
            </div>
          )}
        </button>
      </motion.div>
    </div>
  );
};
