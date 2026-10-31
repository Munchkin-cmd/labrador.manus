'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// ✅ Importa o novo mapa dinâmico
const DynamicMap = dynamic(
  () => import('@/components/DynamicMap'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-white/50 text-xs font-mono uppercase tracking-widest">Carregando mapa dinâmico...</div> }
)

export default function MapaTestPage() {
  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-surface">
      
      {/* Botão de voltar flutuante para você não ficar preso na página */}
      <div className="absolute top-4 left-4 z-[1000]">
        <Link 
          href="/game/home" 
          className="flex items-center gap-2 bg-black/60 hover:bg-black/90 text-white px-4 py-2 rounded-lg border border-white/10 transition-colors backdrop-blur-md text-xs font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Voltar
        </Link>
      </div>

      {/* O Mapa */}
      <DynamicMap onCountryClick={(nome) => console.log('País clicado:', nome)} />
      
    </div>
  )
}