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
        // ⚠️ CORES DO JOGO (MANTIDAS)
        primary: {
          DEFAULT: '#5B21B6',   // roxo-azul principal
          dark:    '#3B0764',
          light:   '#7C3AED',
        },
        secondary: {
          DEFAULT: '#1E3A5F',
          dark:    '#0F1E35',
        },
        coalition: '#16A34A',   // verde coalizão
        opposition: '#DC2626',  // vermelho oposição
        gold: '#F59E0B',

        // 🌈 SURFACE agora é VIDRO TRANSPARENTE
        // para deixar o fundo animado aparecer
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          card:    'rgba(255, 255, 255, 0.05)',
          input:   'rgba(255, 255, 255, 0.06)',
        },

        // 🏳️‍🌈 CORES DO ARCO-ÍRIS (EXCLUSIVAS DO ADMIN)
        pride: {
          red:    '#E40303',
          orange: '#FF8C00',
          yellow: '#FFED00',
          green:  '#008026',
          blue:   '#004DFF',
          purple: '#750787',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #3B0764, #1E3A5F)',
        'gradient-header':  'linear-gradient(90deg, #5B21B6, #1E3A5F)',
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