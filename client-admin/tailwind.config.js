/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bronze: {
          500: '#b87333',
          600: '#a0622d',
          700: '#8b5528'
        },
        silver: {
          500: '#c0c0c0',
          600: '#a8a8a8',
          700: '#909090'
        },
        gold: {
          500: '#FFD700',
          600: '#FFC107',
          700: '#FFB300'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite'
      }
    },
  },
  plugins: [],
}
