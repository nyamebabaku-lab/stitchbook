/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        // Black + gold: a fashion-house feel. brand = gold accents; ink = blacks.
        brand: { 50: '#fdf8ec', 100: '#faefd2', 200: '#f3dca0', 300: '#e9c46a', 400: '#ddaa3f', 500: '#c99227', 600: '#a8761c', 700: '#86591a', 800: '#6b461a', 900: '#583a19', 950: '#321f0a' },
        gold: { 100: '#fef3c7', 300: '#fcd34d', 400: '#f5b83d', 500: '#e0a02a', 600: '#b7791f' },
        ink: { 700: '#2a2a2a', 800: '#1f1f1f', 900: '#161616', 950: '#0b0b0b' },
      },
      boxShadow: { soft: '0 1px 2px rgba(11,11,11,.05), 0 6px 20px rgba(11,11,11,.07)' },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
      },
      animation: { 'fade-in': 'fade-in .25s ease-out', 'slide-up': 'slide-up .25s cubic-bezier(.2,.8,.2,1)' },
    },
  },
  plugins: [],
};
