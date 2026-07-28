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

// Configuração: Ícone, Rota, Cor de fundo quando ativo
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
      className="fixed bottom-0 left-0 right-0 z-40 flex bg-[#0a0a0a] border-t border-white/5"
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
              flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all duration-200
              ${isActive ? tab.bg : 'hover:bg-white/5'}
            `}
          >
            {/* Ícone */}
            <Icon
              size={22}
              className={`transition-colors ${
                isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'
              }`}
              strokeWidth={isActive ? 2.5 : 1.8}
            />

            {/* Label */}
            <span
              className={`text-[10px] font-semibold tracking-widest uppercase transition-colors ${
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