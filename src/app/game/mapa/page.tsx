'use client'
 
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
 
interface CountryInfo {
  id: number // ✅ CORRIGIDO: string → number
  name: string
   slug: string | null  // ← pode ser null
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
 
  useEffect(() => {
    supabase.from('countries')
      .select('id, name, slug, flag_emoji, capital, terrain, is_active')
      .order('name')
      .then(({ data }) => { 
        setCountries(data ?? []); 
        setLoading(false) 
      })
  }, [])
 
  const filtered = countries.filter(c =>
    (!search || c.name.toLowerCase().includes(search.toLowerCase())) &&
    (!filter || c.terrain === filter)
  )
 
  return (
    <div className="flex flex-col gap-4 pb-6 p-4">
 
      <p className="text-xs font-bold tracking-widest text-white/40 uppercase">MAPA MUNDIAL</p>
 
      {/* Legenda de terrenos */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(TERRAIN_COLORS).map(([t, cls]) => (
          <button key={t} onClick={() => setFilter(filter === t ? '' : t)}
            className={`border rounded-xl px-3 py-2 text-xs font-semibold transition-all ${cls}
                        ${filter === t ? 'ring-2 ring-white/20' : 'opacity-70 hover:opacity-100'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
 
      {/* Busca */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Buscar país..."
        className="input-field"
      />
 
      {/* Contagem */}
      <p className="text-white/30 text-xs">
        {filtered.filter(c => c.is_active).length} ativos · {filtered.length} total
      </p>
 
      {/* Lista de países */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-surface-card rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(selected?.id === c.id ? null : c)}
              className={`bg-surface-card rounded-xl p-3 text-left transition-all
                          ${selected?.id === c.id ? 'ring-2 ring-primary' : 'hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.flag_emoji}</span>
                <div className="flex-1 min-w-0">
                  {/* 🔥 NOME DO PAÍS */}
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
 
              {/* Expanded info */}
              {selected?.id === c.id && (
                <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/50 flex flex-col gap-1">
                  <p>⛏️ Recursos: {TERRAIN_RESOURCES[c.terrain]}</p>
                  <p>⚙️ + Aço (via Siderúrgica + Ferro em qualquer terreno)</p>
                  {c.is_active ? (
                    <p className="text-green-400 mt-1">✅ País com jogador ativo</p>
                  ) : (
                    <p className="text-white/30 mt-1">⚪ Disponível para jogadores</p>
                  )}
                  {/* 🔥 BOTÃO PARA VISITAR */}
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
  )
} 