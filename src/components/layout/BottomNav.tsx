'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home,  // HOME
  Newspaper, // FEED
  Landmark, // STATE
  Swords, // WAR
  Globe, // ECO
} from 'lucide-react'

// Configuração: Ícone, Rota, Cor de fundo quando ativo (MANTIDO IGUAL)
const TABS = [
  { label: 'HOME',  href: '/game/home',  icon: Home,  bg: 'bg-green-500/20' },    // Verde
  { label: 'FEED',  href: '/game/feed',  icon: Newspaper, bg: 'bg-blue-500/20' }, // Azul
  { label: 'STATE', href: '/game/state', icon: Landmark, bg: 'bg-yellow-500/20' },  // Amarelo/Ouro
  { label: 'WAR',   href: '/game/war',   icon: Swords,  bg: 'bg-red-500/20' },    // Vermelho
  { label: 'ECO',  href: '/game/eco',  icon: Globe,   bg: 'bg-purple-500/20' },   // Roxo
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      // ✅ Fundo escuro sólido, borda azul nítida e sombra superior para dar destaque
      className="fixed bottom-0 left-0 right-0 z-40 flex bg-[#0E1626] border-t border-[#1E2D4A] shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
      style={{ height: 'var(--bottom-nav-height)' }}
    >
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        const Icon = tab.icon

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`
              relative flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-all duration-300
              ${isActive ? tab.bg : 'hover:bg-white/5'}
            `}
          >
            {/* ✅ Detalhe Tech: Barrinha luminosa no topo da aba ativa */}
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-white rounded-b-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
            )}

            {/* Ícone */}
            <Icon
              size={22}
              className={`transition-all duration-300 ${
                isActive 
                  ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] scale-110' 
                  : 'text-white/40 group-hover:text-white/70'
              }`}
              strokeWidth={isActive ? 2.5 : 1.8}
            />

            {/* Label */}
            <span
              className={`text-[9px] font-bold font-mono tracking-widest uppercase transition-colors ${
                isActive ? 'text-white' : 'text-white/40'
              }`}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}