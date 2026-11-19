import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('en-IN').format(amount);
}

export function formatRelativeTime(dateString: string, lang: string = 'en'): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      if (lang === 'pa') return 'ਹੁਣੇ';
      if (lang === 'hi') return 'अभी';
      return 'just now';
    }
    if (diffMins < 60) {
      if (lang === 'pa') return `${diffMins} ਮਿੰਟ ਪਹਿਲਾਂ`;
      if (lang === 'hi') return `${diffMins} मिनट पहले`;
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      if (lang === 'pa') return `${diffHours} ਘੰਟੇ ਪਹਿਲਾਂ`;
      if (lang === 'hi') return `${diffHours} घंटे पहले`;
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) {
      if (lang === 'pa') return 'ਕੱਲ੍ਹ';
      if (lang === 'hi') return 'कल';
      return 'yesterday';
    }
    if (diffDays < 7) {
      if (lang === 'pa') return `${diffDays} ਦਿਨ ਪਹਿਲਾਂ`;
      if (lang === 'hi') return `${diffDays} दिन पहले`;
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}
