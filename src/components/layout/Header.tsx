'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useCountry } from '@/hooks/useCountry'
import SideMenu from '@/components/menus/SideMenu'
import { Menu } from 'lucide-react'

interface HeaderProps {
  children?: React.ReactNode
}

// ✅ Mapeamento das rotas para os nomes que aparecem no centro
const PAGE_NAMES: Record<string, string> = {
  '/game/home': 'HOME',
  '/game/feed': 'FEED',
  '/game/state': 'ESTADO',
  '/game/war': 'GUERRA',
  '/game/eco': 'ECONOMIA',
  '/game/configuracoes': 'CONFIGURAÇÕES',
  '/game/perfil': 'PERFIL',
  '/game/orcamento': 'ORÇAMENTO',
}

export default function Header({ children }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { country } = useAuthStore()
  const { profile } = useCountry() // ✅ Busca as fotos (flag_url e leader_url)
  const pathname = usePathname()

  // Pega o nome da página atual. Se não achar, deixa em branco.
  const pageTitle = PAGE_NAMES[pathname] || ''

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0E1626] border-b border-[#1E2D4A] shadow-lg">
        {/* Usamos grid de 3 colunas para garantir que o centro fique perfeitamente alinhado */}
        <div className="max-w-7xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center px-4 py-2">
          
          {/* ─── ESQUERDA: Menu + Logo ─── */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMenuOpen(true)}
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors"
              aria-label="Abrir Menu"
            >
              <Menu size={18} />
            </button>
            
            <h1 className="text-white font-black text-base tracking-tight flex items-center gap-1.5 hidden sm:flex">
              labrador
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            </h1>
          </div>

          {/* ─── CENTRO: Nome da Página ─── */}
          <div className="flex justify-center">
            <span className="text-white/60 text-xs font-bold font-mono tracking-widest uppercase">
              {pageTitle}
            </span>
          </div>

          {/* ─── DIREITA: Fotos do Líder e Bandeira ─── */}
          <div className="flex items-center justify-end gap-2">
            {country ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full pl-3 pr-1 py-1">
                <span className="text-[10px] font-bold text-white/80 uppercase hidden md:block">
                  {country.name}
                </span>
                
                {/* Bandeira (Retangular) */}
                <div className="w-7 h-5 rounded-sm overflow-hidden bg-black/50 border border-white/20 flex-shrink-0 flex items-center justify-center">
                  {profile?.flag_url ? (
                    <img src={profile.flag_url} alt="Bandeira" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs">{country.flag_emoji}</span>
                  )}
                </div>

                {/* Líder (Redondo) */}
                <div className="w-7 h-7 rounded-full overflow-hidden bg-black/50 border border-white/20 flex-shrink-0 flex items-center justify-center -ml-1">
                  {profile?.leader_url ? (
                    <img src={profile.leader_url} alt="Líder" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px]">👤</span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-white/40 text-xs font-semibold">Sem país</span>
            )}
          </div>

        </div>
      </header>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}