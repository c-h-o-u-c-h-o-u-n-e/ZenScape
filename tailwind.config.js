/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f4e8d1',
        'ink-black': '#1a1a1a',
        'ink-red': '#e63946',
        'ink-blue': '#457b9d',
        'ink-teal': '#2a9d8f',
        'ink-yellow': '#f4a261',
        'ink-pink': '#f9a8d4',
        'ink-orange': '#ff9800',
        'ink-green': '#4caf50',
        'ink-gold': '#d4a574',
      },
      fontFamily: {
        display: ['KGDarkSide', 'sans-serif'],
        mono: ['KGDarkSide', 'sans-serif'],
        kgdarkside: ['KGDarkSide', 'sans-serif'],
        sans: ['KGDarkSide', 'sans-serif'],
      },
      boxShadow: {
        'press': '4px 4px 0 #1a1a1a',
        'press-blue': '4px 4px 0 #457b9d',
        'press-red': '4px 4px 0 #e63946',
        'press-teal': '4px 4px 0 #2a9d8f',
        'press-lg': '8px 8px 0 #1a1a1a',
      },
    },
  },
  plugins: [],
};
