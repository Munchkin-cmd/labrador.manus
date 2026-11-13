'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    // ✅ Fundo dinâmico (Claro ou Escuro) e transição suave
    <div className="relative flex flex-col min-h-screen overflow-hidden bg-background transition-colors duration-300">
      
      {/* ✅ Header */}
      <Header />

      <main
        className="relative flex-1 overflow-y-auto"
        style={{
          paddingTop: 'var(--header-height, 64px)',
          paddingBottom: 'var(--bottom-nav-height, 60px)',
        }}
      >
        <div className="mx-auto w-full max-w-7xl px-2 py-4">
          {children}
        </div>
      </main>

      {/* ✅ Bottom Navigation */}
      <BottomNav />
    </div>
  )
}