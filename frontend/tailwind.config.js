/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          950: '#090c11',
          900: '#0e131b',
          850: '#121822',
          800: '#171f2b',
          700: '#212b3a',
          600: '#2c3849',
          500: '#4b5a70',
          400: '#7c8ba0',
          300: '#a9b4c4',
          100: '#e7ebf0',
        },
        signal: {
          400: '#3fe1c7',
          500: '#22c9ae',
          600: '#189d88',
        },
        amber: {
          300: '#f4c669',
          400: '#f0b43f',
          500: '#d99420',
        },
        coral: {
          400: '#f2836f',
          500: '#e8593f',
          600: '#c8412b',
        },
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2.2s cubic-bezier(0.2, 0.6, 0.4, 1) infinite',
        'fade-in': 'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
}
