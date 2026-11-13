import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          dark:    '#1D4ED8',
          light:   '#60A5FA',
        },
        secondary: {
          DEFAULT: '#1E293B',
          dark:    '#0F172A',
        },
        coalition: '#10B981',
        opposition: '#EF4444',
        gold: '#F59E0B',

        // ✅ Mantemos os nomes das variáveis para as páginas novas não quebrarem
        surface: {
          DEFAULT: 'var(--surface-default)',
          card:    'var(--surface-card)',
          border:  'var(--surface-border)',
          input:   'var(--surface-input)',
        },

        // ✅ CORRIGIDO: As definições de 'white' e 'black' foram removidas.
        // O Tailwind já possui essas cores por padrão e a sintaxe anterior estava quebrando o CSS.
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0F172A, #1E293B)',
        'gradient-header':  'linear-gradient(90deg, #1E3A8A, #0F172A)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}

export default config