import React from 'react';

interface LiveWaveformProps {
  isListening: boolean;
}

export const LiveWaveform: React.FC<LiveWaveformProps> = ({ isListening }) => {
  if (!isListening) return null;

  const barHeights = [10, 18, 14, 26, 20, 28, 22, 24, 16, 22, 14, 10];

  return (
    <div className="flex items-center justify-center space-x-1.5 h-10 py-1 my-2">
      {barHeights.map((maxH, idx) => (
        <span
          key={idx}
          style={{
            height: `${maxH}px`,
            animation: 'live-soundbar 0.75s ease-in-out infinite alternate',
            animationDelay: `${(idx * 0.08).toFixed(2)}s`,
          }}
          className="w-1.5 rounded-full bg-gradient-to-t from-blue-600 via-indigo-500 to-cyan-400 shadow-xs inline-block origin-bottom will-change-transform"
        />
      ))}
    </div>
  );
};
