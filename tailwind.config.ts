import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      colors: {
        ice: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        rink: {
          dark: '#0a0f1e',
          navy: '#0d1b2a',
          panel: '#111827',
          card: '#1a2535',
          border: '#1e3a5f',
        }
      },
      backgroundImage: {
        'rink-gradient': 'linear-gradient(135deg, #0a0f1e 0%, #0d1b2a 50%, #0a1628 100%)',
      }
    },
  },
  plugins: [],
}
export default config
