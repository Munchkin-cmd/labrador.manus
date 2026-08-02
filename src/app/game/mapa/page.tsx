'use client'
 
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

// ✅ Componente do mapa carregado apenas no navegador
const MapaPlano = dynamic(
  () => import('@/components/MapaPlano'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-white/50">Carregando mapa...</div> }
)
 
interface CountryInfo {
  id: number
  name: string
  slug: string | null
  flag_emoji: string
  capital: string
  terrain: string
  is_active: boolean
}
 
const TERRAIN_COLORS: Record<string, string> = {
  planicie:   'bg-green-500/20 text-green-400 border-green-500/30',
  orogenico:  'bg-gray-500/20 text-gray-300 border-gray-500/30',
  extremista: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  anfibio:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
}
 
const TERRAIN_RESOURCES: Record<string, string> = {
  planicie:   'Madeira · Petróleo · Carvão',
  orogenico:  'Ouro · Ferro · Urânio',
  extremista: 'Petróleo · Urânio',
  anfibio:    'Madeira · Ouro · Petróleo',
}
 
export default function MapaPage() {
  const [countries, setCountries]   = useState<CountryInfo[]>([])
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('')
  const [selected, setSelected]     = useState<CountryInfo | null>(null)
  const [loading, setLoading]       = useState(true)
  // ✅ Estado para controlar o menu mobile
  const [isMenuOpen, setIsMenuOpen] = useState(false)
 
  useEffect(() => {
    supabase.from('countries')
      .select('id, name, slug, flag_emoji, capital, terrain, is_active')
      .order('name')
      .then(({ data }) => { 
        setCountries(data ?? []); 
        setLoading(false) 
      })
  }, [])
 
  const handleGlobeClick = (nomePais: string) => {
    const pais = countries.find(c => c.name === nomePais);
    if (pais) {
      setSelected(prev => prev?.id === pais.id ? null : pais);
    }
    // ✅ Fecha o menu automaticamente ao clicar em um país no celular
    setIsMenuOpen(false)
  }
 
  const filtered = countries.filter(c =>
    (!search || c.name.toLowerCase().includes(search.toLowerCase())) &&
    (!filter || c.terrain === filter)
  )
 
  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#0d1b2a]">
      
      {/* ✅ BOTÃO HAMBÚRGUER (Apenas no celular) */}
      <button 
        onClick={() => setIsMenuOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 bg-black/40 rounded-lg border border-white/10 md:hidden text-white hover:bg-black/60 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      </button>

      {/* ✅ OVERLAY ESCURO (Fundo preto translúcido para fechar o menu clicando fora) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* ✅ PAINEL LATERAL (Lista de países) */}
      <div 
        className={`
          fixed inset-y-0 left-0 z-50 w-[85%] max-w-[400px] bg-[#0d1b2a]/95 backdrop-blur-md border-r border-white/10 
          transform transition-transform duration-300 ease-in-out
          ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:static md:translate-x-0 md:flex md:w-[400px]
        `}
      >
        {/* Botão para Fechar (Apenas no celular) */}
        <button 
          onClick={() => setIsMenuOpen(false)}
          className="absolute top-4 right-4 md:hidden text-white/60 hover:text-white p-1 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" x2="6" y1="6" y2="18" />
            <line x1="6" x2="18" y1="6" y2="18" />
          </svg>
        </button>

        {/* Conteúdo da lista */}
        <div className="flex flex-col h-full overflow-y-auto p-4 pt-16 md:pt-4 custom-scrollbar">
          <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-4">MAPA MUNDIAL</p>
 
          <div className="grid grid-cols-2 gap-2 mb-4">
            {Object.entries(TERRAIN_COLORS).map(([t, cls]) => (
              <button key={t} onClick={() => setFilter(filter === t ? '' : t)}
                className={`border rounded-xl px-3 py-2 text-xs font-semibold transition-all ${cls}
                            ${filter === t ? 'ring-2 ring-white/20' : 'opacity-70 hover:opacity-100'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
 
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar país..."
            className="input-field w-full mb-4"
          />
 
          <p className="text-white/30 text-xs mb-4">
            {filtered.filter(c => c.is_active).length} ativos · {filtered.length} total
          </p>
 
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-surface-card rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="flex flex-col gap-2 pb-20">
              {filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelected(selected?.id === c.id ? null : c)}
                  className={`bg-surface-card/50 backdrop-blur-sm rounded-xl p-3 text-left transition-all
                              ${selected?.id === c.id ? 'ring-2 ring-primary' : 'hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{c.flag_emoji}</span>
                    <div className="flex-1 min-w-0">
                      <Link 
                        href={`/game/pais/${c.slug}`}
                        className="text-white font-semibold text-sm truncate hover:text-primary-light transition-colors block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.name}
                      </Link>
                      <p className="text-white/40 text-xs">{c.capital}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${TERRAIN_COLORS[c.terrain]}`}>
                        {c.terrain}
                      </span>
                      {c.is_active && (
                        <span className="text-xs text-green-400">● ativo</span>
                      )}
                    </div>
                  </div>
 
                  {selected?.id === c.id && (
                    <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/50 flex flex-col gap-1">
                      <p>⛏️ Recursos: {TERRAIN_RESOURCES[c.terrain]}</p>
                      <p>⚙️ + Aço (via Siderúrgica + Ferro em qualquer terreno)</p>
                      {c.is_active ? (
                        <p className="text-green-400 mt-1">✅ País com jogador ativo</p>
                      ) : (
                        <p className="text-white/30 mt-1">⚪ Disponível para jogadores</p>
                      )}
                      <Link 
                        href={`/game/pais/${c.slug}`}
                        className="mt-2 text-primary-light hover:text-primary text-sm font-semibold transition-colors block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        👁️ Ver perfil do país →
                      </Link>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🌍 MAPA PLANO (Lado Direito) */}
      <div className="flex-1 h-full relative z-0">
        <MapaPlano onCountryClick={handleGlobeClick} />
      </div>

    </div>
  )
}