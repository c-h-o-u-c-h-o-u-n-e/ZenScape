/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--theme-background)',
        'ink-black': 'var(--theme-primary-text)',
        'ink-red': 'var(--theme-cta)',
        'ink-blue': 'var(--theme-accent)',
        'ink-teal': 'var(--theme-accent)',
        'ink-yellow': 'var(--theme-surface)',
        'ink-pink': 'var(--theme-accent)',
        'ink-orange': 'var(--theme-surface)',
        'ink-green': 'var(--theme-surface)',
        'ink-gold': 'var(--theme-accent)',
      },
      fontFamily: {
        display: ['KGDarkSide', 'sans-serif'],
        mono: ['KGDarkSide', 'sans-serif'],
        kgdarkside: ['KGDarkSide', 'sans-serif'],
        sans: ['KGDarkSide', 'sans-serif'],
      },
      boxShadow: {
        'press': '4px 4px 0 var(--theme-primary-text)',
        'press-blue': '4px 4px 0 var(--theme-accent)',
        'press-red': '4px 4px 0 var(--theme-cta)',
        'press-teal': '4px 4px 0 var(--theme-accent)',
        'press-lg': '8px 8px 0 var(--theme-primary-text)',
      },
    },
  },
  plugins: [],
};
