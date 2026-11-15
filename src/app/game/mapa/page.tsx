'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Filter, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

const DynamicMap = dynamic(
  () => import('@/components/DynamicMap'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-white/50 text-xs font-mono uppercase tracking-widest">Carregando mapa dinâmico...</div> }
)

interface CountryInfo {
  id: number
  name: string
  slug: string | null
  flag_emoji: string
  capital: string
  terrain: string
  is_active: boolean
  users?: { flag_url: string | null, last_login?: string } | { flag_url: string | null, last_login?: string }[] | null
}

// ✅ Dados de Diplomacia
interface DiplomacyInfo {
  relation: 'enemy' | 'neutral' | 'ally' | 'friend' | 'none'
  hasEmbassy: boolean
  sanctions: boolean
  trade: boolean
}

const TERRAIN_COLORS: Record<string, string> = {
  planicie:   'bg-green-500/10 text-green-400 border-green-500/30',
  orogenico:  'bg-surface-input text-white/70 border-surface-border',
  extremista: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  anfibio:    'bg-blue-500/10 text-blue-400 border-blue-500/30',
}

const TERRAIN_RESOURCES: Record<string, string> = {
  planicie:   'Madeira · Petróleo · Carvão',
  orogenico:  'Ouro · Ferro · Urânio',
  extremista: 'Petróleo · Urânio',
  anfibio:    'Madeira · Ouro · Petróleo',
}

export default function MapaTestPage() {
  // ✅ Adicionado 'user' para pegarmos o ID e atualizar o last_login
  const { user, country: myCountry } = useAuthStore() 
  
  const [countries, setCountries] = useState<CountryInfo[]>([])
  const [diplomacyMap, setDiplomacyMap] = useState<Record<number, DiplomacyInfo>>({})
  
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CountryInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // ✅ ESTADOS DOS FILTROS
  const [filterTerrain, setFilterTerrain] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string[]>([]) // 'player', 'npc', 'online', 'offline'
  const [filterRelation, setFilterRelation] = useState<string[]>([]) // 'enemy', 'neutral', 'ally', 'friend'
  const [filterIntl, setFilterIntl] = useState<string[]>([]) // 'embassy', 'none', 'sanctioned', 'trade'
  const [expandedSection, setExpandedSection] = useState<string | null>('terrain')

  // ✅ BUSCA OS DADOS E CRUZA AS INFORMAÇÕES
  useEffect(() => {
    async function fetchData() {
      // ✅ ATUALIZA O SEU LOGIN ASSIM QUE ENTRA NO MAPA
      // Isso faz com que você apareça "Online" para os outros jogadores
      if (user?.id) {
        await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('user_id', user.id)
      }

      // 1. Busca Países (Trazendo o last_login dos jogadores)
      const { data: cData } = await supabase.from('countries')
        .select('id, name, slug, flag_emoji, capital, terrain, is_active, users(flag_url, last_login)')
        .order('name')
      
      setCountries((cData as any) ?? [])

      // 2. Busca Diplomacia (Se o jogador tiver um país)
      if (myCountry?.id) {
        const { data: dData } = await supabase.from('diplomacy')
          .select('country_a_id, country_b_id, relation_score, status, sanctions_active, has_embassy, trade_agreement')
          .or(`country_a_id.eq.${myCountry.id},country_b_id.eq.${myCountry.id}`)

        const dMap: Record<number, DiplomacyInfo> = {}
        
        dData?.forEach((d: any) => {
          const otherId = d.country_a_id === myCountry.id ? d.country_b_id : d.country_a_id
          const score = d.relation_score || 0
          
          let rel: DiplomacyInfo['relation'] = 'neutral'
          if (score >= 80) rel = 'friend'
          else if (score >= 50) rel = 'ally'
          else if (score <= -50) rel = 'enemy'

          dMap[otherId] = {
            relation: rel,
            hasEmbassy: d.has_embassy,
            sanctions: d.sanctions_active,
            trade: d.trade_agreement
          }
        })
        setDiplomacyMap(dMap)
      }
      setLoading(false)
    }
    fetchData()
  }, [myCountry?.id, user?.id])

  // ✅ LÓGICA DE FILTRAGEM AVANÇADA
  const filtered = countries.filter(c => {
    const d = diplomacyMap[c.id]
    
    // Busca
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.capital.toLowerCase().includes(search.toLowerCase())) return false

    // Filtro Terreno
    if (filterTerrain.length > 0 && !filterTerrain.includes(c.terrain)) return false

    // Filtro Status (Player/NPC/Online/Offline)
    if (filterStatus.length > 0) {
      const isPlayer = c.is_active
      const isNPC = !c.is_active
      
      const userData = Array.isArray(c.users) ? c.users[0] : c.users
      const lastLoginTime = userData?.last_login ? new Date(userData.last_login).getTime() : 0
      
      // ✅ Tolerância de 15 minutos
      const isOnline = isPlayer && (Date.now() - lastLoginTime < 15 * 60 * 1000) 
      
      const matchStatus = 
        (filterStatus.includes('player') && isPlayer) ||
        (filterStatus.includes('npc') && isNPC) ||
        (filterStatus.includes('online') && isOnline) ||
        (filterStatus.includes('offline') && !isOnline)
      
      if (!matchStatus) return false
    }

    // Filtro Relações
    if (filterRelation.length > 0) {
      const currentRel = d?.relation || 'neutral'
      if (!filterRelation.includes(currentRel)) return false
    }

    // Filtro Internacional
    if (filterIntl.length > 0) {
      const hasEmbassy = d?.hasEmbassy
      const hasTrade = d?.trade
      const isSanctioned = d?.sanctions
      const hasNoRelations = !hasEmbassy && !hasTrade && !isSanctioned

      const matchIntl =
        (filterIntl.includes('embassy') && hasEmbassy) ||
        (filterIntl.includes('trade') && hasTrade) ||
        (filterIntl.includes('sanctioned') && isSanctioned) ||
        (filterIntl.includes('none') && hasNoRelations)
      
      if (!matchIntl) return false
    }

    return true
  })

  const handleGlobeClick = (nomePais: string) => {
    const pais = countries.find(c => c.name === nomePais);
    if (pais) setSelected(prev => prev?.id === pais.id ? null : pais);
    setIsMenuOpen(false)
  }

  const toggleFilter = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value])
  }

  // ✅ Componente de Caixa de Filtro
  const FilterBox = ({ title, section, options, active, setActive }: any) => {
    const isExpanded = expandedSection === section
    return (
      <div className="border border-surface-border rounded-lg overflow-hidden bg-surface-input">
        <button 
          onClick={() => setExpandedSection(isExpanded ? null : section)}
          className="w-full flex items-center justify-between p-3 text-[11px] font-bold text-white/80 uppercase tracking-widest hover:bg-white/5 transition-colors"
        >
          {title}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {isExpanded && (
          <div className="p-3 pt-1 flex flex-col gap-2 border-t border-surface-border/50">
            {options.map((opt: any) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${active.includes(opt.value) ? 'bg-primary border-primary' : 'border-white/20 group-hover:border-primary/50'}`}>
                  {active.includes(opt.value) && <Check size={12} className="text-white" />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={active.includes(opt.value)} 
                  onChange={() => toggleFilter(setActive, opt.value)} 
                />
                <span className={`text-[11px] font-mono transition-colors ${active.includes(opt.value) ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-surface">
      
      {/* OVERLAY ESCURO */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* PAINEL LATERAL */}
      <div className={`fixed inset-y-0 left-0 z-50 w-[85%] max-w-[400px] bg-surface-card border-r border-surface-border shadow-2xl transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* BOTÃO DE FILTRO */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`absolute top-1/2 -translate-y-1/2 right-0 translate-x-full z-50 py-4 px-1.5 border border-l-0 rounded-r-lg shadow-[4px_0_15px_rgba(0,0,0,0.3)] flex flex-col items-center gap-2 transition-colors duration-300 ${isMenuOpen ? 'bg-primary border-primary text-white' : 'bg-surface-card border-surface-border text-white hover:bg-surface-input'}`}
        >
          <Filter size={18} />
          <span className="text-[9px] font-bold uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">Filtro</span>
        </button>

        {/* CONTEÚDO DA LISTA */}
        <div className="flex flex-col h-full overflow-y-auto p-4 custom-scrollbar">
          
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <p className="text-xs font-bold tracking-widest text-white uppercase font-mono">Mapa Mundial</p>
          </div>

          {/* INPUT DE BUSCA */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar país..."
            className="input-field w-full mb-4 bg-surface-input text-sm"
          />

          {/* SISTEMA DE FILTROS EM SANFONA */}
          <div className="flex flex-col gap-2 mb-6">
            <FilterBox title="Terreno" section="terrain" active={filterTerrain} setActive={setFilterTerrain} options={[
              { label: 'Planície', value: 'planicie' },
              { label: 'Orogênico', value: 'orogenico' },
              { label: 'Extremista', value: 'extremista' },
              { label: 'Anfíbio', value: 'anfibio' },
            ]} />
            
            <FilterBox title="Status" section="status" active={filterStatus} setActive={setFilterStatus} options={[
              { label: 'Player (Jogador)', value: 'player' },
              { label: 'NPC (Sem jogador)', value: 'npc' },
              { label: 'Online', value: 'online' },
              { label: 'Offline', value: 'offline' },
            ]} />

            <FilterBox title="Relações" section="relation" active={filterRelation} setActive={setFilterRelation} options={[
              { label: 'Amigo', value: 'friend' },
              { label: 'Aliado', value: 'ally' },
              { label: 'Neutro', value: 'neutral' },
              { label: 'Inimigo', value: 'enemy' },
            ]} />

            <FilterBox title="Internacional" section="intl" active={filterIntl} setActive={setFilterIntl} options={[
              { label: 'Com Embaixada', value: 'embassy' },
              { label: 'Livre Comércio', value: 'trade' },
              { label: 'Sancionado', value: 'sanctioned' },
              { label: 'Sem Relações', value: 'none' },
            ]} />
          </div>

          <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-4 flex justify-between">
            <span>Resultados</span>
            <span className="text-primary font-bold">{filtered.length} países</span>
          </p>

          {/* RENDERIZAÇÃO DA LISTA */}
          {loading ? (
            <div className="flex flex-col gap-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-surface-input border border-surface-border rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="flex flex-col gap-2 pb-10">
              {filtered.map(c => {
                const userData = Array.isArray(c.users) ? c.users[0] : c.users;
                const flagUrl = userData?.flag_url;
                
                const lastLoginTime = userData?.last_login ? new Date(userData.last_login).getTime() : 0;
                // ✅ Tolerância de 15 minutos para considerar Online
                const isOnline = c.is_active && (Date.now() - lastLoginTime < 15 * 60 * 1000) 
                
                const dInfo = diplomacyMap[c.id];

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(selected?.id === c.id ? null : c)}
                    className={`bg-surface-card border rounded-xl p-3 text-left transition-all ${selected?.id === c.id ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'border-surface-border hover:border-primary/40 hover:bg-white/5'}`}
                  >
                    <div className="flex items-center gap-3">
                      {flagUrl ? (
                        <img src={flagUrl} alt={c.name} className="w-8 h-8 rounded-full object-cover border border-white/20 shadow-md shrink-0" />
                      ) : (
                        <span className="text-2xl drop-shadow-md shrink-0">{c.flag_emoji}</span>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <Link href={`/game/pais/${c.slug}`} className="text-white font-bold text-xs uppercase tracking-wider truncate hover:text-primary transition-colors block mb-0.5" onClick={(e) => e.stopPropagation()}>
                          {c.name}
                        </Link>
                        <p className="text-white/50 text-[10px] font-mono">{c.capital}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1.5">
                        {/* TAG PLAYER / NPC */}
                        <span className={`text-[9px] font-bold font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${c.is_active ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                          {c.is_active ? 'Player' : 'NPC'}
                        </span>
                        {/* TAG ONLINE / OFFLINE */}
                        <span className={`text-[9px] font-bold font-mono uppercase tracking-widest flex items-center gap-1 ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} /> 
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    {/* DETALHES EXPANDIDOS */}
                    {selected?.id === c.id && (
                      <div className="mt-3 pt-3 border-t border-surface-border text-[10px] font-mono text-white/60 flex flex-col gap-1.5">
                        <p>⛏️ RECURSOS: <span className="text-white/80">{TERRAIN_RESOURCES[c.terrain]}</span></p>
                        
                        {/* Relações */}
                        {dInfo && (
                          <p>🤝 RELAÇÃO: <span className={`font-bold ${dInfo.relation === 'enemy' ? 'text-red-400' : dInfo.relation === 'friend' ? 'text-green-400' : 'text-white'}`}>{dInfo.relation.toUpperCase()}</span></p>
                        )}

                        <div className="flex gap-2 mt-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded border ${TERRAIN_COLORS[c.terrain]}`}>{c.terrain}</span>
                          {dInfo?.hasEmbassy && <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">Embaixada</span>}
                          {dInfo?.trade && <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded">Livre Comércio</span>}
                          {dInfo?.sanctions && <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded">Sancionado</span>}
                        </div>

                        <Link href={`/game/pais/${c.slug}`} className="mt-3 text-primary hover:text-primary-light text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1 bg-primary/10 border border-primary/20 py-2 rounded-lg" onClick={(e) => e.stopPropagation()}>
                          👁️ Ver perfil do país →
                        </Link>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* MAPA DINÂMICO */}
      <div className="flex-1 h-full relative z-0">
        <DynamicMap 
          onCountryClick={handleGlobeClick} 
          filteredCountryNames={filtered.map(c => c.name)} 
        />
      </div>

      {/* BOTÃO VOLTAR */}
      <div className="absolute top-4 right-4 z-[1000]">
        <Link href="/game/home" className="flex items-center gap-2 bg-black/60 hover:bg-black/90 text-white px-4 py-2 rounded-lg border border-white/10 transition-colors backdrop-blur-md text-xs font-bold uppercase tracking-widest">
          <ArrowLeft size={16} /> Voltar
        </Link>
      </div>

    </div>
  )
}