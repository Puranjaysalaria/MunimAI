import React from 'react';

interface LiveWaveformProps {
  isListening: boolean;
}

export const LiveWaveform: React.FC<LiveWaveformProps> = ({ isListening }) => {
  if (!isListening) return null;

  return (
    <div className="flex items-center justify-center space-x-1.5 h-8 py-1 my-1">
      {[40, 75, 55, 95, 60, 85, 45, 90, 50, 70].map((height, idx) => (
        <span
          key={idx}
          className="w-1 bg-listening rounded-full animate-pulse"
          style={{
            height: `${height}%`,
            animationDuration: `${0.4 + (idx % 4) * 0.15}s`,
            animationDelay: `${idx * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
};
