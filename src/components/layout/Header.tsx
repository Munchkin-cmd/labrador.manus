'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import SideMenu from '@/components/menus/SideMenu'

interface HeaderProps {
  children?: React.ReactNode
}

// 🎨 Paleta viva que vai rotacionar a cada 1s
const COLORS = [
  '#2563eb', // Azul
  '#38bdf8', // Azul bebê
  '#22c55e', // Verde
  '#ef4444', // Vermelho
  '#a855f7', // Roxo
  '#eab308', // Amarelo
]

export default function Header({ children }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [colorIndex, setColorIndex] = useState(0)
  const { country } = useAuthStore()

  // ⏱️ Troca de cor a cada 1 segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex(prev => (prev + 1) % COLORS.length)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const currentColor = COLORS[colorIndex]

  return (
    <>
      <header
        className="w-full shadow-md transition-colors duration-700 ease-in-out"
        style={{ backgroundColor: currentColor }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-3 py-1">
          {/* Lado esquerdo: menu + logo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(true)}
              className="w-7 h-7 flex items-center justify-center text-white text-lg hover:bg-white/20 rounded-md transition-colors"
              aria-label="Menu"
            >
              ☰
            </button>
            <h1 className="text-white font-black text-sm tracking-tight drop-shadow-sm">
              labrador
            </h1>
          </div>

          {/* Lado direito: saudação + país + bandeira */}
          <div className="flex items-center gap-1.5 text-white">
            {country ? (
              <>
                <span className="font-semibold text-[11px] hidden sm:inline drop-shadow-sm">
                  Bem-vindo, {country.name}
                </span>
                <span className="text-lg leading-none">{country.flag_emoji}</span>
              </>
            ) : (
              <span className="text-white/70 text-[11px]">Nenhum país</span>
            )}
          </div>
        </div>
      </header>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}