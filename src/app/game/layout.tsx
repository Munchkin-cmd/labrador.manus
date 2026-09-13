'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="relative flex flex-col min-h-screen overflow-hidden bg-[#0a0a1a]">
      {/* 🌈 Fundo com gradiente animado */}
      <div
        className="fixed inset-0 -z-20 animate-gradient bg-[length:400%_400%]"
        style={{
          background:
            'linear-gradient(135deg, #1e1b4b 0%, #312e81 20%, #0e7490 40%, #065f46 60%, #7c2d12 80%, #581c87 100%)',
        }}
      />

      {/* ✨ Blobs de luz coloridos flutuando */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/30 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-fuchsia-500/25 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-emerald-500/25 blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* ✅ Header animado */}
      <Header />

      <main
        className="relative flex-1 overflow-y-auto"
        style={{
          paddingTop: 'var(--header-height)',
          paddingBottom: 'var(--bottom-nav-height)',
        }}
      >
        {/* 🪟 Container de vidro que envolve o conteúdo */}
        <div className="mx-auto w-full max-w-7xl px-3 py-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl p-3 sm:p-4">
            {children}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}