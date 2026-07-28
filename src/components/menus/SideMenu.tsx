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
  Banknote as Tax, 
  Settings, 
  Trophy, 
  LogOut
} from 'lucide-react'

// Configuração do menu com ícones da Lucide
const MENU_ITEMS = [
  { label: 'MAPA',          href: '/game/mapa',          icon: Map },
  { label: 'ARMAZÉM',       href: '/game/armazem',       icon: Package },
  { label: 'ORÇAMENTO',     href: '/game/orcamento',     icon: Banknote },
  { label: 'PASSAPORTE',    href: '/game/passaporte',    icon: FileText },
  { label: 'BRIEFING',      href: '/game/briefing',      icon: Bell }, // ✅ Corrigido para Bell
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
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-surface-card border-r border-white/10
                    transition-transform duration-300 flex flex-col
                    ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10"
             style={{ background: 'linear-gradient(90deg, #5B21B6, #1E3A5F)' }}>
          <span className="text-white font-black text-lg">labrador</span>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl">✕</button>
        </div>

        {/* Menu items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-5 py-3.5 transition-colors
                  ${isActive ? 'text-white' : 'text-white/60 hover:text-white/80 hover:bg-white/5'}
                `}
              >
                {/* Ícone */}
                <span className="relative text-xl w-7 flex justify-center">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </span>
                <span className={`text-sm tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleSignOut}
            className="w-full text-left flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-semibold text-sm">Sair do Jogo</span>
          </button>
        </div>
      </aside>
    </>
  )
}