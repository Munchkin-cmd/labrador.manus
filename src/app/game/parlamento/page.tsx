'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCountry } from '@/hooks/useCountry'
import { supabase } from '@/lib/supabase/client'
import { useParliament, LawCatalog } from '@/hooks/useParliament'
import { Landmark, Users, Scale, ShieldAlert, FileText, Pencil, X, Check, Loader2, Clock } from 'lucide-react'

export default function ParliamentPage() {
  const { country } = useAuthStore()
  const { data: initialData, profile, loading: loadingCountry } = useCountry()
  
  const { 
    parliament, catalog, loading, proposeLaw, hasCoalitionMajority, refetch 
  } = useParliament()
  
  const [countryData, setCountryData] = useState<any>(null)
  const [fetchingCountry, setFetchingCountry] = useState(true)

  // Estados para Edição de Nome dos Partidos
  const [editingCoalition, setEditingCoalition] = useState(false)
  const [editingOpposition, setEditingOpposition] = useState(false)
  const [coalitionName, setCoalitionName] = useState('')
  const [oppositionName, setOppositionName] = useState('')

  // Estados para o Modal de Leis
  const [showLawModal, setShowLawModal] = useState(false)
  const [proposingLawId, setProposingLawId] = useState<number | null>(null)

  // Estado do Timer
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    async function fetchCountryData() {
      if (!country?.id) return
      const { data } = await supabase.from('countries').select('systems, state_structure').eq('id', country.id).single()
      setCountryData(data)
      setFetchingCountry(false)
    }
    fetchCountryData()
  }, [country?.id])

  // Sincronizar nomes dos partidos quando o parlamento for carregado
  useEffect(() => {
    if (parliament) {
      setCoalitionName((parliament as any).coalition_name || 'Coalizão')
      setOppositionName((parliament as any).opposition_name || 'Oposição')
    }
  }, [parliament])

  // ⏱️ Lógica do Timer de Eleição (Assumindo intervalo de 7 dias)
  useEffect(() => {
    if (!parliament?.last_election_at) return

    const DIAS_PARA_ELEICAO = 7 // 🛠️ ALTERE AQUI se o mandato for diferente
    const interval = setInterval(() => {
      const lastElection = new Date(parliament.last_election_at).getTime()
      const nextElection = lastElection + (DIAS_PARA_ELEICAO * 24 * 60 * 60 * 1000)
      const now = new Date().getTime()
      const diff = nextElection - now

      if (diff <= 0) {
        setTimeLeft('Aguardando Eleição')
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24))
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
        const m = Math.floor((diff / 1000 / 60) % 60)
        const s = Math.floor((diff / 1000) % 60)
        setTimeLeft(`${d}d ${h}h ${m}m ${s}s`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [parliament?.last_election_at])

  async function savePartyName(type: 'coalition' | 'opposition') {
    if (!parliament?.id) return
    const field = type === 'coalition' ? 'coalition_name' : 'opposition_name'
    const value = type === 'coalition' ? coalitionName : oppositionName
    
    await supabase.from('parliament').update({ [field]: value } as any).eq('id', parliament.id)
    refetch()
    if (type === 'coalition') setEditingCoalition(false)
    else setEditingOpposition(false)
  }

  async function handleProposeLaw(law: LawCatalog) {
    setProposingLawId(law.id)
    const res = await proposeLaw(law.id)
    
    if (res.success || res.requiresForce) {
      setShowLawModal(false)
      if (res.requiresForce) {
        alert(`⚠️ ${res.error}\n\nA oposição tem maioria! Você precisa forçar a lei (custo: ${res.forceCost} PP).`)
      } else {
        alert(`✅ ${res.message}`)
      }
    } else {
      alert(`❌ ${res.error}`)
    }
    setProposingLawId(null)
  }

  if (loading || loadingCountry || fetchingCountry) {
    return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!parliament || !initialData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 pt-[68px]">
        <Scale size={48} className="text-white/20" />
        <p className="text-white/50 font-mono text-sm uppercase">Seu país ainda não possui um parlamento.</p>
      </div>
    )
  }

  const coalition = parliament.coalition_seats || 0
  const opposition = parliament.opposition_seats || 0
  const total = parliament.total_seats || 100

  // Gera a lista de assentos e divide em duas metades
  const seats = Array.from({ length: total }, (_, i) => i < coalition ? 'coalition' : 'opposition')
  const half = Math.ceil(total / 2)
  const leftSeats = seats.slice(0, half)
  const rightSeats = seats.slice(half)

  return (
    // ✅ pt-[68px] para o espaçamento exato que você pediu
    <div className="flex flex-col gap-6 pb-24 pt-68 max-w-5xl mx-auto w-full px-4">
      
      {/* 🌟 BANNER DO PASSAPORTE AQUI */}
      <div className="relative h-56 bg-surface-card border border-surface-border rounded-xl overflow-hidden shadow-2xl mb-2">
        {profile?.banner_urls?.[0] && (
          <img src={profile.banner_urls[0]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-surface-card/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          {profile?.flag_url ? (
            <div className="w-20 h-14 rounded-md overflow-hidden border border-surface-border shadow-lg bg-surface-input flex items-center justify-center">
              <img src={profile.flag_url} alt="Bandeira" className="w-full h-full object-cover" />
            </div>
          ) : (
            <span className="text-5xl drop-shadow-lg">{initialData.flag_emoji}</span>
          )}
          <h2 className="text-white font-black text-2xl text-center uppercase tracking-widest drop-shadow-md">
            {initialData.name}
          </h2>
          <p className="text-primary/80 text-[11px] font-mono font-bold uppercase tracking-widest">
            CAPITAL: {initialData.capital}
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Landmark className="text-primary" /> Parlamento Nacional
          </h1>
          <p className="text-white/50 text-sm mt-1">Gerencie as leis e o equilíbrio de poder do seu país.</p>
        </div>
        
        {/* ⏱️ TIMER DE ELEIÇÃO */}
        <div className="bg-black/30 border border-surface-border rounded-lg px-4 py-2 flex items-center gap-3 shadow-inner">
          <Clock size={16} className="text-primary" />
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Próxima Eleição</p>
            <p className="text-white font-mono font-bold text-sm">{timeLeft || 'Calculando...'}</p>
          </div>
        </div>
      </div>

      {/* Sistema de Governo */}
      <div className={`border p-4 rounded-xl flex items-center justify-between ${
        countryData?.systems === 'Democracia' 
          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
          : 'bg-red-500/10 border-red-500/30 text-red-400'
      }`}>
        <div className="flex items-center gap-3">
          {countryData?.systems === 'Democracia' ? <Scale size={24} /> : <ShieldAlert size={24} />}
          <div>
            <p className="font-bold text-sm uppercase tracking-widest">Sistema: {countryData?.systems || 'Desconhecido'}</p>
            <p className="text-xs opacity-80 mt-0.5">Estrutura: {countryData?.state_structure}</p>
          </div>
        </div>
      </div>

      {/* ASSENTOS VISUAIS */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 shadow-lg">
        <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Users size={16} /> Composição da Casa ({total} assentos)
        </h2>
        
        <div className="flex flex-col sm:flex-row justify-between text-sm font-mono font-bold mb-4 gap-4">
          {/* Coalizão */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            {editingCoalition ? (
              <div className="flex items-center gap-1">
                <input 
                  type="text" 
                  value={coalitionName} 
                  onChange={e => setCoalitionName(e.target.value)}
                  className="bg-black/50 border border-green-500/50 rounded px-2 py-1 text-white text-xs w-32 focus:outline-none"
                  autoFocus
                />
                <button onClick={() => savePartyName('coalition')} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
                <button onClick={() => setEditingCoalition(false)} className="text-white/40 hover:text-white"><X size={14} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-green-400">{coalitionName}: {coalition}</span>
                <button onClick={() => setEditingCoalition(true)} className="text-white/30 hover:text-white"><Pencil size={12} /></button>
              </div>
            )}
          </div>
          
          {/* Oposição */}
          <div className="flex items-center gap-2">
            {editingOpposition ? (
              <div className="flex items-center gap-1">
                <input 
                  type="text" 
                  value={oppositionName} 
                  onChange={e => setOppositionName(e.target.value)}
                  className="bg-black/50 border border-red-500/50 rounded px-2 py-1 text-white text-xs w-32 focus:outline-none"
                  autoFocus
                />
                <button onClick={() => savePartyName('opposition')} className="text-red-400 hover:text-red-300"><Check size={14} /></button>
                <button onClick={() => setEditingOpposition(false)} className="text-white/40 hover:text-white"><X size={14} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-red-400">{oppositionName}: {opposition}</span>
                <button onClick={() => setEditingOpposition(true)} className="text-white/30 hover:text-white"><Pencil size={12} /></button>
              </div>
            )}
            <div className="w-3 h-3 rounded-full bg-red-500 ml-2" />
          </div>
        </div>

        {/* 🪑 GRID DE CADEIRAS DIVIDIDO EM DUAS COLUNAS (50/50) */}
        <div className="flex justify-center gap-8 sm:gap-16 py-6 bg-black/20 rounded-lg p-4 border border-white/5">
          {/* Lado Esquerdo */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {leftSeats.map((seat, idx) => (
              <div 
                key={`L-${idx}`} 
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-sm transition-colors ${
                  seat === 'coalition' ? 'bg-green-500' : 'bg-red-500'
                }`} 
              />
            ))}
          </div>

          {/* Corredor Central */}
          <div className="w-px bg-white/10" />

          {/* Lado Direito */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {rightSeats.map((seat, idx) => (
              <div 
                key={`R-${idx}`} 
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-sm transition-colors ${
                  seat === 'coalition' ? 'bg-green-500' : 'bg-red-500'
                }`} 
              />
            ))}
          </div>
        </div>
        
        <div className="mt-4 flex justify-between text-[10px] text-white/40 font-mono">
          <span>Última eleição: {parliament?.last_election_at ? new Date(parliament.last_election_at).toLocaleDateString() : 'Nenhuma'}</span>
          <span>Tipo: {parliament?.election_type || 'Normal'}</span>
        </div>
      </div>

      {/* Projetos de Lei / Catálogo */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
            <FileText size={16} /> Ações Legislativas
          </h2>
          <button 
            onClick={() => setShowLawModal(true)}
            className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded transition-colors"
          >
            + Propor Lei
          </button>
        </div>
        
        <div className="text-center py-8 border border-white/5 bg-black/20 rounded-lg flex flex-col items-center justify-center">
          {hasCoalitionMajority() ? (
            <>
              <p className="text-green-400 text-sm font-bold mb-1">Sua coalizão tem maioria!</p>
              <p className="text-white/40 text-xs">Você pode aprovar leis livremente.</p>
            </>
          ) : (
            <>
              <p className="text-red-400 text-sm font-bold mb-1">A oposição tem maioria.</p>
              <p className="text-white/40 text-xs">Aprovar leis exigirá forçar a votação (custo de Poder Político).</p>
            </>
          )}
        </div>
      </div>

      {/* MODAL DE LEIS */}
      {showLawModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a2e] border border-surface-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-surface-border">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <FileText size={20} className="text-primary" /> Catálogo de Leis
              </h3>
              <button onClick={() => setShowLawModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
              {catalog.length === 0 ? (
                <p className="text-white/50 text-center">Nenhuma lei disponível no catálogo.</p>
              ) : (
                catalog.map(law => (
                  <div key={law.id} className="bg-black/30 border border-surface-border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <p className="text-white font-bold text-sm">{law.name}</p>
                      <p className="text-white/50 text-xs mt-1">{law.description}</p>
                      <p className="text-primary text-[10px] uppercase font-mono mt-2">Custo Base: {law.political_power_cost} PP</p>
                    </div>
                    <button 
                      onClick={() => handleProposeLaw(law)}
                      disabled={proposingLawId === law.id}
                      className="bg-primary hover:bg-primary-light disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shrink-0 flex items-center gap-2"
                    >
                      {proposingLawId === law.id ? <Loader2 size={14} className="animate-spin" /> : 'Propor'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}