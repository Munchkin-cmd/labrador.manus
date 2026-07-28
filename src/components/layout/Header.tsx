'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import SideMenu from '@/components/menus/SideMenu'

interface HeaderProps {
  children?: React.ReactNode
}

export default function Header({ children }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { country } = useAuthStore()

  return (
    <>
      <header className="header-gradient w-full border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-1">
          {/* Lado esquerdo: menu + logo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(true)}
              className="w-8 h-8 flex items-center justify-center text-white text-xl hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Menu"
            >
              ☰
            </button>
            <h1 className="text-white font-black text-base tracking-tight">
              labrador
            </h1>
          </div>

          {/* Lado direito: saudação + país + bandeira */}
          <div className="flex items-center gap-1.5 text-white">
            {country ? (
              <>
                <span className="font-semibold text-xs hidden sm:inline">
                  Seja bem vindo novamente, {country.name}
                </span>
                <span className="text-xl leading-none">{country.flag_emoji}</span>
              </>
            ) : (
              <span className="text-white/40 text-xs">Nenhum país</span>
            )}
          </div>
        </div>
      </header>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}