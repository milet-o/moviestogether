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
        paper: '#faf7f5', // Fundo principal cremoso
        cinema: {
          bg: '#faf7f5',
          surface: '#ffffff',
          card: '#ffffff',
          border: '#f0e6e6',
          text: '#4a4040', // Cinza escuro fofo
          muted: '#8e8484',
          accent: '#ffb6c1', // Rosa claro / Light pink
          'accent-hover': '#ff9eb1',
          rose: '#ff8da1',
          gold: '#fcd34d',
          green: '#6ee7b7',
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
