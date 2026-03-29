import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A0F1E',
          light: '#0F172A',
          card: '#1E293B',
        },
        amber: {
          DEFAULT: '#F5A623',
          light: '#FBC55A',
          dark: '#D4891F',
        },
        slate: {
          text: '#E2E8F0',
          muted: '#94A3B8',
          border: '#334155',
        }
      },
      fontFamily: {
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
} satisfies Config
