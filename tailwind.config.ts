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
        // 🎨 CORES DO JOGO ATUALIZADAS PARA AZUL TECH
        primary: {
          DEFAULT: '#3B82F6',   // Azul vivo (botões e destaques)
          dark:    '#1D4ED8',
          light:   '#60A5FA',
        },
        secondary: {
          DEFAULT: '#1E293B',
          dark:    '#0F172A',
        },
        coalition: '#10B981',   // Verde coalizão
        opposition: '#EF4444',  // Vermelho oposição
        gold: '#F59E0B',

        // ✅ SURFACE AGORA É AZUL ESCURO SÓLIDO (Sem vidro)
        surface: {
          DEFAULT: '#060A14',   // Fundo geral da tela (quase preto)
          card:    '#0E1626',   // Fundo dos cards/painéis (azul escuro)
          border:  '#1E2D4A',   // Cor das bordas finas
          input:   '#141F35',   // Fundo dos inputs e áreas internas
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
        // Gradientes atualizados para tons de azul escuro
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