import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cinema: {
          bg: '#080b12',
          surface: '#0f1420',
          card: '#141926',
          border: '#1e2535',
          text: '#e8eaf0',
          muted: '#6b7280',
          accent: '#c084fc',
          'accent-hover': '#a855f7',
          rose: '#f472b6',
          gold: '#fbbf24',
          green: '#34d399',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-in': 'slideIn 0.4s ease forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
