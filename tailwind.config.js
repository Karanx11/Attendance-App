/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand accent — brown (light brown in light mode, brown in dark)
        brand: {
          50: '#f8f3ee',
          100: '#efe3d4',
          200: '#e1c9ac',
          300: '#cfab81',
          400: '#bb8b57',
          500: '#a06f3f',
          600: '#855832',
          700: '#6b4628',
          800: '#553823',
          900: '#452e1d',
        },
        // Status colors
        present: '#22c55e',
        wfh: '#a06f3f',
        leave: '#800000',
        weekend: '#ef4444',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(74, 50, 30, 0.14)',
        'glass-sm': '0 4px 16px 0 rgba(74, 50, 30, 0.1)',
        card: '0 2px 12px 0 rgba(74, 50, 30, 0.08)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'sheet-up': 'sheet-up 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
}
