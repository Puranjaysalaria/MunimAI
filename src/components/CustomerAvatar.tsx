import React from 'react';
import { ShieldCheck, Crown } from 'lucide-react';

interface CustomerAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  trustScore?: number;
  showBadge?: boolean;
}

// Generate deterministic vibrant pastel gradient based on customer name
const GRADIENTS = [
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-600',
  'from-blue-500 to-indigo-700',
  'from-rose-500 to-pink-600',
  'from-purple-500 to-violet-700',
  'from-cyan-500 to-blue-600',
];

function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const CustomerAvatar: React.FC<CustomerAvatarProps> = ({
  name,
  size = 'md',
  trustScore,
  showBadge = false,
}) => {
  const initials = getInitials(name || 'Customer');
  const gradient = getGradient(name || 'Customer');

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-lg',
  }[size];

  const isHighTrust = trustScore !== undefined && trustScore >= 90;

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      <div
        className={`${sizeClasses} rounded-2xl bg-gradient-to-br ${gradient} text-white font-extrabold flex items-center justify-center shadow-xs border border-white/40 select-none tracking-wide`}
      >
        {initials}
      </div>

      {showBadge && trustScore !== undefined && (
        <div
          className={`absolute -bottom-1 -right-1 p-0.5 rounded-full border-2 border-white ${
            isHighTrust
              ? 'bg-amber-400 text-amber-950 shadow-xs'
              : 'bg-emerald-500 text-white shadow-xs'
          }`}
          title={`Trust Score: ${trustScore}%`}
        >
          {isHighTrust ? (
            <Crown className="w-2.5 h-2.5" />
          ) : (
            <ShieldCheck className="w-2.5 h-2.5" />
          )}
        </div>
      )}
    </div>
  );
};
