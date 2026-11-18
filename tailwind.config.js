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
          DEFAULT: '#0B6E4F',
          dark: '#085039',
          light: '#E8F5E9',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#F5A524',
          hover: '#E0921B',
          light: '#FFF8E7',
          foreground: '#1B1B1B',
        },
        background: '#FAF7F2',
        surface: '#FFFFFF',
        'app-text': '#1B1B1B',
        'app-muted': '#5B5B5B',
        owed: {
          DEFAULT: '#D64545',
          light: '#FEE2E2',
          text: '#991B1B',
        },
        received: {
          DEFAULT: '#1E9E5A',
          light: '#DCFCE7',
          text: '#166534',
        },
        listening: {
          DEFAULT: '#2563EB',
          light: '#DBEAFE',
          pulse: 'rgba(37, 99, 235, 0.4)',
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
        'mic': '0 8px 30px rgba(245, 165, 36, 0.4)',
        'listening': '0 0 0 12px rgba(37, 99, 235, 0.2), 0 0 35px rgba(37, 99, 235, 0.4)',
        'card': '0 2px 10px rgba(0, 0, 0, 0.05)',
        'sheet': '0 -10px 25px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
}
