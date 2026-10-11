/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#0f0f12',
        purple: {
          DEFAULT: '#8b5cf6',
          dark: '#6d28d9',
        },
        mint: {
          DEFAULT: '#34d399',
          dark: '#10b981',
        },
      },
    },
  },
  plugins: [],
};