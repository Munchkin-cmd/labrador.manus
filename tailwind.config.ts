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

        // ✅ CORRIGIDO: Substituído as variáveis pelos HEXs escuros do seu globals.css
        surface: {
          DEFAULT: '#0E1626', // Fundo escuro dos cards
          card:    '#0E1626', // Fundo escuro dos cards
          border:  '#1E2D4A', // Azul escuro (a borda não fica mais branca)
          input:   '#141F35', // Fundo escuro dos inputs
        },
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