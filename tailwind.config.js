/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#065F46', // Royal Forest Emerald
          dark: '#022C22',
          glow: '#10B981',
          light: '#ECFDF5',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#F59E0B', // Saffron Gold
          hover: '#D97706',
          dark: '#B45309',
          light: '#FEF3C7',
          foreground: '#1E293B',
        },
        background: '#FAF8F5', // Warm organic paper canvas
        surface: '#FFFFFF',
        'app-text': '#0F172A', // Deep Slate Ink
        'app-muted': '#64748B',
        owed: {
          DEFAULT: '#E11D48', // Vibrant Rose Crimson
          light: '#FFE4E6',
          text: '#9F1239',
        },
        received: {
          DEFAULT: '#059669', // Emerald Green
          light: '#D1FAE5',
          text: '#065F46',
        },
        listening: {
          DEFAULT: '#3B82F6', // Royal Blue Aura
          light: '#EFF6FF',
          pulse: 'rgba(59, 130, 246, 0.45)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'Noto Sans Gurmukhi', 'system-ui', 'sans-serif'],
        devanagari: ['Noto Sans Devanagari', 'sans-serif'],
        gurmukhi: ['Noto Sans Gurmukhi', 'sans-serif'],
      },
      minHeight: {
        'touch': '64px',
      },
      minWidth: {
        'touch': '64px',
      },
      boxShadow: {
        'mic': '0 8px 30px rgba(245, 158, 11, 0.4)',
        'mic-hero': '0 12px 35px -4px rgba(245, 158, 11, 0.45), 0 4px 15px -2px rgba(245, 158, 11, 0.3)',
        'listening': '0 0 0 10px rgba(59, 130, 246, 0.2), 0 0 40px rgba(59, 130, 246, 0.5)',
        'card': '0 2px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'float': '0 14px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 10px -2px rgba(0, 0, 0, 0.03)',
        'dock': '0 16px 40px -8px rgba(15, 23, 42, 0.25), 0 2px 8px rgba(0, 0, 0, 0.06)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.7)',
        'sheet': '0 -12px 35px rgba(0, 0, 0, 0.16)',
      },
      animation: {
        'shimmer': 'shimmer 2.5s infinite linear',
        'float-slow': 'float 4s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.24, 0, 0.38, 1) infinite',
        'wave': 'wave 1.2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
    },
  },
  plugins: [],
}
