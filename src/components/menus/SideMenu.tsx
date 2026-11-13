'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { 
  Map, Package, Banknote, FileText, Bell, Store, Settings, LogOut, X, Trophy,
  Home, Globe, Landmark, Swords, Newspaper, Coins, ChevronDown, ChevronRight,
  User, Users, MapPin, Shield, Crosshair, Briefcase
} from 'lucide-react'

// Estrutura do Menu
type MenuItem = {
  label: string
  href: string
  icon: any
}

type MenuGroup = {
  id: string
  title: string
  icon: any
  items: MenuItem[]
}

const MENU_GROUPS: MenuGroup[] = [
  {
    id: 'principal',
    title: 'Principal',
    icon: Home,
    items: [
      { label: 'HOME', href: '/game/home', icon: Home },
    ]
  },
  {
    id: 'world',
    title: 'World',
    icon: Globe,
    items: [
      { label: 'MAPA', href: '/game/mapa', icon: Map },
      { label: 'RANKING', href: '/game/rankings', icon: Trophy },
      { label: 'MERCADO', href: '/game/mercado', icon: Store },
      { label: 'BRIEFING', href: '/game/briefing', icon: Bell },
    ]
  },
  {
    id: 'state',
    title: 'State',
    icon: Landmark,
    items: [
      // ✅ CORREÇÃO AQUI: Rota alterada para /game/state
      { label: 'PERFIL', href: '/game/state', icon: User },
      { label: 'PARLAMENTO', href: '/game/parlamento', icon: Users },
      { label: 'REGIÕES', href: '/game/regioes', icon: MapPin },
      { label: 'CONFIGURAÇÕES', href: '/game/configuracoes', icon: Settings },
      { label: 'PASSAPORTE', href: '/game/passaporte', icon: FileText },
    ]
  },
  {
    id: 'war',
    title: 'War',
    icon: Swords,
    items: [
      { label: 'WARS', href: '/game/war', icon: Swords },
      { label: 'EXÉRCITO', href: '/game/exercito', icon: Shield },
    ]
  },
  {
    id: 'feed',
    title: 'Global Feed',
    icon: Newspaper,
    items: [
      { label: 'ARTIGOS', href: '/game/feed', icon: Newspaper },
    ]
  },
  {
    id: 'economy',
    title: 'Economy',
    icon: Coins,
    items: [
      { label: 'ORÇAMENTO', href: '/game/orcamento', icon: Banknote },
      { label: 'ARMAZÉM', href: '/game/armazem', icon: Package },
    ]
  },
]

interface SideMenuProps {
  open: boolean
  onClose: () => void
}

export default function SideMenu({ open, onClose }: SideMenuProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuthStore()

  // Estado para controlar quais grupos estão abertos
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Abre automaticamente o grupo que contém a página atual
    const initialState: Record<string, boolean> = {}
    MENU_GROUPS.forEach(group => {
      initialState[group.id] = group.items.some(item => pathname.startsWith(item.href))
    })
    return initialState
  })

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleSignOut() {
    onClose()
    await signOut()
    router.push('/auth/login')
  }

  return (
    <>
      {/* Backdrop escuro */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#0E1626] border-r border-[#1E2D4A]
                    transition-transform duration-300 flex flex-col shadow-2xl
                    ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header do Menu */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1E2D4A] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-black text-lg tracking-tight">labrador</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Itens do Menu (Sanfona) */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar flex flex-col gap-1">
          {MENU_GROUPS.map((group) => {
            const isOpen = openGroups[group.id]
            const hasActiveChild = group.items.some(item => pathname.startsWith(item.href))
            const GroupIcon = group.icon

            return (
              <div key={group.id} className="flex flex-col">
                
                {/* Título do Grupo */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-colors group ${
                    hasActiveChild && !isOpen 
                      ? 'text-[#3B82F6] bg-[#3B82F6]/5' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 font-bold text-xs tracking-widest uppercase">
                    <GroupIcon size={18} className={hasActiveChild ? 'text-[#3B82F6]' : ''} />
                    <span>{group.title}</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown size={14} className="text-white/40" />
                  ) : (
                    <ChevronRight size={14} className="text-white/40" />
                  )}
                </button>

                {/* Sub-itens (Links) */}
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-96 opacity-100 mt-1 mb-2' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 pl-9 pr-2 border-l border-[#1E2D4A] ml-4">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                      const ItemIcon = item.icon
                      
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md text-[11px] font-bold tracking-wider transition-all ${
                            isActive
                              ? 'bg-[#141F35] text-white shadow-inner border-l-2 border-[#3B82F6] -ml-[1px]'
                              : 'text-white/40 hover:text-white hover:bg-white/5 border-l-2 border-transparent -ml-[1px]'
                          }`}
                        >
                          <ItemIcon size={16} className={isActive ? 'text-[#3B82F6]' : ''} />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>

              </div>
            )
          })}
        </nav>

        {/* Botão de Sair */}
        <div className="border-t border-[#1E2D4A] p-4 shrink-0 bg-[#0E1626]">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200"
          >
            <LogOut size={16} />
            <span className="font-bold text-xs uppercase tracking-widest">Sair do Jogo</span>
          </button>
        </div>
      </aside>
    </>
  )
}