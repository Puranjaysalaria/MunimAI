import React from 'react';
import { motion } from 'framer-motion';

interface LiveWaveformProps {
  isListening: boolean;
}

export const LiveWaveform: React.FC<LiveWaveformProps> = ({ isListening }) => {
  if (!isListening) return null;

  const barCount = 12;

  return (
    <div className="flex items-center justify-center space-x-1.5 h-10 py-1 my-2">
      {Array.from({ length: barCount }).map((_, idx) => (
        <motion.span
          key={idx}
          className="w-1.5 rounded-full bg-gradient-to-t from-blue-600 via-indigo-500 to-cyan-400 shadow-xs"
          animate={{
            height: ['8px', `${14 + ((idx * 7) % 22) + Math.random() * 8}px`, '8px'],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 0.6 + (idx % 3) * 0.15,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: idx * 0.06,
          }}
        />
      ))}
    </div>
  );
};
