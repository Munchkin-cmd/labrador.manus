'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { 
  Map, 
  Package, 
  Banknote, 
  FileText, 
  Bell, 
  Store, 
  Settings, 
  LogOut,
  X
} from 'lucide-react'

// Configuração do menu com ícones da Lucide
const MENU_ITEMS = [
  { label: 'MAPA',          href: '/game/mapa',          icon: Map },
  { label: 'ARMAZÉM',       href: '/game/armazem',       icon: Package },
  { label: 'ORÇAMENTO',     href: '/game/orcamento',     icon: Banknote },
  { label: 'PASSAPORTE',    href: '/game/passaporte',    icon: FileText },
  { label: 'BRIEFING',      href: '/game/briefing',      icon: Bell },
  { label: 'MERCADO',       href: '/game/mercado',       icon: Store },
  { label: 'CONFIGURAÇÕES', href: '/game/configuracoes', icon: Settings },
]

interface SideMenuProps {
  open: boolean
  onClose: () => void
}

export default function SideMenu({ open, onClose }: SideMenuProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuthStore()

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
          className="fixed inset-0 z-50 bg-black/70 transition-opacity"
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
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1E2D4A]">
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

        {/* Itens do Menu */}
        <nav className="flex-1 overflow-y-auto py-3">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-[#141F35] text-white border-l-2 border-[#3B82F6] shadow-inner' 
                    : 'text-white/50 hover:text-white hover:bg-white/5 border-l-2 border-transparent'}
                `}
              >
                {/* Ícone */}
                <span className={`flex justify-center ${isActive ? 'text-[#3B82F6]' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </span>
                
                {/* Texto */}
                <span className={`text-xs tracking-widest uppercase ${isActive ? 'font-black' : 'font-bold'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Botão de Sair */}
        <div className="border-t border-[#1E2D4A] p-4">
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