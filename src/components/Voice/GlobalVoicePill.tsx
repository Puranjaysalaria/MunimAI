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
  const isPointerDownRef = useRef(false);
  const pointerStartTimeRef = useRef(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldModeRef = useRef(false);

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

  // Handles click and long-press reliably:
  // Normal tap (< 450ms): instant 1-click toggle on/off (no double click bug)
  // Long press (> 450ms): hold-to-talk (starts after 450ms, stops on pointerup)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    isPointerDownRef.current = true;
    pointerStartTimeRef.current = Date.now();
    isHoldModeRef.current = false;

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    // If already active, pointerup will toggle off immediately
    if (isListening || voiceState === 'listening') {
      return;
    }

    holdTimerRef.current = setTimeout(() => {
      if (isPointerDownRef.current) {
        isHoldModeRef.current = true;
        setIsHolding(true);
        triggerHaptic('start');
        playAudioCue('start');
        onStartListening();
      }
    }, 450);
  };

  const handlePointerUp = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (isHoldModeRef.current) {
      // Completed hold-to-talk
      isHoldModeRef.current = false;
      setIsHolding(false);
      triggerHaptic('stop');
      onStopListening();
    } else {
      // Normal single click toggle
      setIsHolding(false);
      if (isListening || voiceState === 'listening') {
        triggerHaptic('stop');
        playAudioCue('cancel');
        onStopListening();
      } else {
        triggerHaptic('start');
        playAudioCue('start');
        onStartListening();
      }
    }
  };

  const handlePointerCancel = () => {
    isPointerDownRef.current = false;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isHoldModeRef.current) {
      isHoldModeRef.current = false;
      setIsHolding(false);
      onStopListening();
    }
  };

  // Localized status labels from i18n
  const getStatusLabel = () => {
    if (voiceState === 'listening') return t.voice.listening;
    if (voiceState === 'thinking') return t.voice.thinking;
    if (voiceState === 'success') return t.voice.success;
    if (voiceState === 'error') return errorMessage || t.voice.retry;
    return t.voice.tapToSpeak;
  };

  const isExpanded = voiceState === 'listening' || voiceState === 'thinking';

  return (
    <div
      className="fixed bottom-22 md:bottom-8 right-4 sm:right-6 md:right-8 z-40 select-none pointer-events-none flex items-center flex-row-reverse"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Floating Circular Mic Button (Bottom Right Corner Chatbot/Assistant Style) */}
      <motion.div
        layout
        animate={{ scale: isHolding ? 1.08 : 1 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { type: 'spring', damping: 25, stiffness: 340 }
        }
        className="pointer-events-auto relative flex-shrink-0"
      >
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (isListening || voiceState === 'listening') {
                triggerHaptic('stop');
                playAudioCue('cancel');
                onStopListening();
              } else {
                triggerHaptic('start');
                playAudioCue('start');
                onStartListening();
              }
            }
          }}
          aria-label={getStatusLabel()}
          title={getStatusLabel()}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-2xl relative touch-target-64 before:absolute before:-inset-2 before:content-[''] ${
            voiceState === 'listening'
              ? 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white ring-4 ring-emerald-400/50 shadow-emerald-500/40 border-2 border-white/80'
              : voiceState === 'thinking'
              ? 'bg-gradient-to-tr from-indigo-700 via-indigo-600 to-purple-600 text-white ring-4 ring-indigo-400/40 shadow-indigo-500/40 border-2 border-indigo-300'
              : voiceState === 'success'
              ? 'bg-emerald-600 text-white border-2 border-emerald-400 shadow-emerald-600/30 ring-2 ring-emerald-400/40'
              : voiceState === 'error'
              ? 'bg-rose-600 text-white border-2 border-rose-400 shadow-rose-600/30 ring-2 ring-rose-400/40'
              : 'bg-slate-900/95 hover:bg-slate-900 text-emerald-400 hover:text-emerald-300 border-2 border-slate-700/90 hover:border-emerald-500/70 shadow-sheet hover:shadow-emerald-950/40 ring-1 ring-white/10 backdrop-blur-md hover:scale-105 active:scale-95'
          }`}
        >
          {/* Active Listening Ripple / Wave Animation */}
          {voiceState === 'listening' ? (
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-white/40" />
              <Mic className="w-6 h-6 stroke-[2.6] text-white relative z-10" />
            </div>
          ) : voiceState === 'thinking' ? (
            <Loader2 className="w-6 h-6 animate-spin stroke-[2.6] text-white" />
          ) : voiceState === 'success' ? (
            <Check className="w-6 h-6 stroke-[3] text-white" />
          ) : voiceState === 'error' ? (
            <AlertCircle className="w-6 h-6 stroke-[2.6] text-white" />
          ) : (
            /* Idle: Crisp Mic Icon with subtle ready indicator */
            <div className="relative flex items-center justify-center">
              <Mic className="w-6 h-6 stroke-[2.4]" />
              {/* Ready green dot badge */}
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-900" />
              </span>
            </div>
          )}
        </button>
      </motion.div>

      {/* Floating Transcript & Soundbars (Expands smoothly to the left of the mic icon) */}
      <AnimatePresence>
        {(liveTranscript || isExpanded) && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 16, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 12, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mr-3 max-w-[70vw] sm:max-w-xs md:max-w-md bg-slate-950/95 text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md pointer-events-auto flex items-center space-x-3"
          >
            {/* Live audio soundbars when listening */}
            {voiceState === 'listening' && (
              <div className="flex items-center space-x-1 h-5 flex-shrink-0 px-1 border-r border-slate-800 pr-2.5">
                {[10, 20, 14, 24, 16, 12].map((maxH, i) => (
                  <span
                    key={i}
                    style={{
                      height: `${maxH}px`,
                      animation: prefersReducedMotion
                        ? 'none'
                        : `live-soundbar 0.65s ease-in-out infinite alternate`,
                      animationDelay: `${(i * 0.1).toFixed(2)}s`,
                    }}
                    className="w-1 rounded-full bg-emerald-400 shadow-xs inline-block"
                  />
                ))}
              </div>
            )}

            <div className="truncate">
              <p className="text-xs font-bold text-slate-100 line-clamp-2">
                {liveTranscript ? `"${liveTranscript}"` : getStatusLabel()}
              </p>
              {liveTranscript && (
                <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                  {getStatusLabel()}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
