'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCountry } from '@/hooks/useCountry'
import { supabase } from '@/lib/supabase/client'
import { useParliament, LawCatalog } from '@/hooks/useParliament'
import { Landmark, Users, Scale, ShieldAlert, FileText, Pencil, X, Check, Loader2, Clock, ArrowLeft, Info, History } from 'lucide-react'

const LAW_EXPLANATIONS: Record<number, string> = {
  1: 'Propõe um acordo de paz para encerrar uma guerra ativa. O outro país precisará aceitar a proposta.',
  2: 'Altera o nome oficial do seu país. Escolha um nome que represente sua nova era.',
  3: 'Cria uma nova região no seu território. A região herdará o bioma (terreno) da sua capital.',
  4: 'Transfere a capital do seu país para uma das suas regiões existentes.',
  8: 'Declara guerra contra outra nação. Você deve escolher qual das suas regiões enviará as tropas e qual região inimiga será atacada.',
  9: 'Remove as sanções econômicas entre você e outro país, estabelecendo uma relação de livre comércio. (Só disponível se houver sanções ativas).',
  10: 'Aplica um embargo econômico contra outro país, bloqueando o comércio e prejudicando a economia dele.',
  11: 'Envia tropas para apoiar um dos lados de uma guerra que já está acontecendo entre outros países.',
  12: 'Transfere uma das suas regiões (e todos os seus edifícios) para o controle de outro país.',
  13: 'Altera a estrutura de governo do seu país (Ex: Democracia, Monarquia, Ditadura, etc).',
  16: 'Liga a máquina de imprimir dinheiro. Adiciona 1 Bilhão à economia do seu país imediatamente.',
  17: 'Altera as taxas de imposto cobradas sobre a população e as indústrias do seu país.'
}

export default function ParliamentPage() {
  const { country } = useAuthStore()
  const { data: initialData, profile, loading: loadingCountry } = useCountry()
  
  const { 
    parliament, catalog, loading, proposeLaw, forceLawApproval, runRandomElection, hasCoalitionMajority, refetch, getForceCost
  } = useParliament()
  
  const [countryData, setCountryData] = useState<any>(null)
  const [fetchingCountry, setFetchingCountry] = useState(true)

  // Estados para Edição de Nome dos Partidos
  const [editingCoalition, setEditingCoalition] = useState(false)
  const [editingOpposition, setEditingOpposition] = useState(false)
  const [coalitionName, setCoalitionName] = useState('')
  const [oppositionName, setOppositionName] = useState('')

  // Estados para o Modal de Leis e Histórico
  const [showLawModal, setShowLawModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedLaw, setSelectedLaw] = useState<LawCatalog | null>(null)
  const [proposingLawId, setProposingLawId] = useState<number | null>(null)
  
  // Estados para preenchimento do formulário da lei
  const [lawTarget, setLawTarget] = useState<any>({})
  const [myRegions, setMyRegions] = useState<any[]>([])
  const [enemyRegions, setEnemyRegions] = useState<any[]>([])
  const [allCountries, setAllCountries] = useState<any[]>([])
  const [activeWars, setActiveWars] = useState<any[]>([])
  const [hasSanctions, setHasSanctions] = useState(false)

  // Estado do Timer
  const [timeLeft, setTimeLeft] = useState('')
  const electionTriggeredRef = useRef(false)

  const isDemocracy = countryData?.systems?.toLowerCase() === 'democracia'

  useEffect(() => {
    async function fetchCountryData() {
      if (!country?.id) return
      const { data } = await supabase.from('countries').select('systems, state_structure').eq('id', country.id).single()
      setCountryData(data)
      setFetchingCountry(false)
    }
    fetchCountryData()
  }, [country?.id])

  useEffect(() => {
    async function fetchAuxData() {
      if (!country?.id || !showLawModal) return
      
      const [regionsRes, countriesRes, warsRes, diploRes] = await Promise.all([
        supabase.from('regions').select('id, name').eq('country_id', country.id),
        supabase.from('countries').select('id, name').neq('id', country.id),
        supabase.from('wars')
          .select('id, status, attacker:countries!wars_attacker_id_fkey(name), defender:countries!wars_defender_id_fkey(name)')
          .eq('status', 'active'),
        supabase.from('diplomacy')
          .select('id')
          .or(`country_a_id.eq.${country.id},country_b_id.eq.${country.id}`)
          .eq('sanctions_active', true)
      ])
      
      setMyRegions(regionsRes.data || [])
      setAllCountries(countriesRes.data || [])
      setActiveWars(warsRes.data || [])
      setHasSanctions((diploRes.data?.length || 0) > 0)
    }
    fetchAuxData()
  }, [showLawModal, country?.id])

  useEffect(() => {
    async function fetchEnemyRegions() {
      if (!lawTarget.countryId) {
        setEnemyRegions([])
        return
      }
      const { data } = await supabase.from('regions').select('id, name').eq('country_id', lawTarget.countryId)
      setEnemyRegions(data || [])
    }
    fetchEnemyRegions()
  }, [lawTarget.countryId])

  useEffect(() => {
    if (parliament) {
      setCoalitionName((parliament as any).coalition_name || 'Coalizão')
      setOppositionName((parliament as any).opposition_name || 'Oposição')
    }
  }, [parliament])

  // ⏱️ Lógica do Timer de Eleição (6 HORAS)
  useEffect(() => {
    if (!parliament?.last_election_at || !isDemocracy || !countryData) {
      setTimeLeft('AUTORITÁRIO')
      return
    }

    const INTERVALO_ELEICAO_MS = 6 * 60 * 60 * 1000

    const interval = setInterval(async () => {
      const lastElection = new Date(parliament.last_election_at).getTime()
      const nextElection = lastElection + INTERVALO_ELEICAO_MS
      const now = new Date().getTime()
      const diff = nextElection - now

      if (diff <= 0) {
        setTimeLeft('00:00:00')
        if (!electionTriggeredRef.current) {
          electionTriggeredRef.current = true
          await runRandomElection()
          await refetch()
          electionTriggeredRef.current = false
        }
      } else {
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
        const m = Math.floor((diff / 1000 / 60) % 60)
        const s = Math.floor((diff / 1000) % 60)
        setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [parliament?.last_election_at, isDemocracy, countryData, runRandomElection, refetch])

  async function savePartyName(type: 'coalition' | 'opposition') {
    if (!parliament?.id) return
    const field = type === 'coalition' ? 'coalition_name' : 'opposition_name'
    const value = type === 'coalition' ? coalitionName : oppositionName
    
    await supabase.from('parliament').update({ [field]: value } as any).eq('id', parliament.id)
    refetch()
    if (type === 'coalition') setEditingCoalition(false)
    else setEditingOpposition(false)
  }

  async function handleProposeSubmit() {
    if (!selectedLaw) return
    setProposingLawId(selectedLaw.id)

    if (!isDemocracy) {
      const res = await forceLawApproval(selectedLaw.id, lawTarget, true)
      
      if (res.success) {
        setShowLawModal(false)
        setSelectedLaw(null)
        setLawTarget({})
        alert(`✅ ${res.message}`)
      } else {
        alert(`❌ ${res.error}`)
      }
    } else {
      const res = await proposeLaw(selectedLaw.id, lawTarget)
      
      if (res.success) {
        setShowLawModal(false)
        setSelectedLaw(null)
        setLawTarget({})
        alert(`✅ ${res.message}`)
      } else if (res.requiresForce) {
        const cost = res.forceCost!
        const confirmForce = confirm(
          `⚠️ A oposição tem maioria!\n\n` +
          `Para forçar a aprovação, você pagará:\n` +
          `💰 R$ ${cost.money.toLocaleString()}\n` +
          `🪙 ${cost.gold} Ouro\n` +
          `📉 -${cost.governability}% de Governabilidade\n\n` +
          `Deseja continuar?`
        )
        
        if (confirmForce) {
          const forceRes = await forceLawApproval(selectedLaw.id, lawTarget, false)
          if (forceRes.success) {
            setShowLawModal(false)
            setSelectedLaw(null)
            setLawTarget({})
            alert(`✅ ${forceRes.message}`)
          } else {
            alert(`❌ ${forceRes.error}`)
          }
        }
      } else {
        alert(`❌ ${res.error}`)
      }
    }
    setProposingLawId(null)
  }

  const filteredCatalog = catalog.filter(law => {
    if (law.id === 9 && !hasSanctions) return false
    return true
  })

  if (loading || loadingCountry || fetchingCountry) {
    return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!parliament || !initialData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 pt-68">
        <Scale size={48} className="text-white/20" />
        <p className="text-white/50 font-mono text-sm uppercase">Seu país ainda não possui um parlamento.</p>
      </div>
    )
  }

  const coalition = parliament.coalition_seats || 0
  const opposition = parliament.opposition_seats || 0
  const total = parliament.total_seats || 100

  const seats = Array.from({ length: total }, (_, i) => i < coalition ? 'coalition' : 'opposition')
  const half = Math.ceil(total / 2)
  const leftSeats = seats.slice(0, half)
  const rightSeats = seats.slice(half)

  const currentForceCost = selectedLaw ? getForceCost(selectedLaw.id) : null

  return (
    <div className="flex flex-col gap-6 pb-10 pt-68 max-w-5xl mx-auto w-full px-4">
      
      {/* BANNER */}
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
        
        {/* ⏱️ TIMER DE ELEIÇÃO / AUTORITARISMO */}
        <div className={`border rounded-lg px-4 py-2 flex items-center gap-3 shadow-inner ${isDemocracy ? 'bg-black/30 border-surface-border' : 'bg-red-500/10 border-red-500/30'}`}>
          {isDemocracy ? <Clock size={16} className="text-primary" /> : <ShieldAlert size={16} className="text-red-400" />}
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
              {isDemocracy ? 'Próxima Eleição' : 'Status do Regime'}
            </p>
            <p className={`font-mono font-bold text-sm ${isDemocracy ? 'text-white' : 'text-red-400'}`}>
              {timeLeft || 'Calculando...'}
            </p>
          </div>
        </div>
      </div>

      {/* Sistema de Governo */}
      <div className={`border p-4 rounded-xl flex items-center justify-between ${
        isDemocracy 
          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
          : 'bg-red-500/10 border-red-500/30 text-red-400'
      }`}>
        <div className="flex items-center gap-3">
          {isDemocracy ? <Scale size={24} /> : <ShieldAlert size={24} />}
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
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            {editingCoalition ? (
              <div className="flex items-center gap-1">
                <input type="text" value={coalitionName} onChange={e => setCoalitionName(e.target.value)} className="bg-black/50 border border-green-500/50 rounded px-2 py-1 text-white text-xs w-32 focus:outline-none" autoFocus />
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
          
          <div className="flex items-center gap-2">
            {editingOpposition ? (
              <div className="flex items-center gap-1">
                <input type="text" value={oppositionName} onChange={e => setOppositionName(e.target.value)} className="bg-black/50 border border-red-500/50 rounded px-2 py-1 text-white text-xs w-32 focus:outline-none" autoFocus />
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

        {/* ✅ ASSENTOS NA HORIZONTAL (Retângulo) */}
        <div className="flex justify-center gap-6 sm:gap-12 py-6 bg-black/20 rounded-lg p-4 border border-white/5 overflow-x-auto">
          <div className="grid grid-cols-10 gap-1.5 sm:gap-2 shrink-0">
            {leftSeats.map((seat, idx) => (
              <div key={`L-${idx}`} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-sm transition-colors ${seat === 'coalition' ? 'bg-green-500' : 'bg-red-500'}`} />
            ))}
          </div>
          <div className="w-px bg-white/10 shrink-0" />
          <div className="grid grid-cols-10 gap-1.5 sm:gap-2 shrink-0">
            {rightSeats.map((seat, idx) => (
              <div key={`R-${idx}`} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-sm transition-colors ${seat === 'coalition' ? 'bg-green-500' : 'bg-red-500'}`} />
            ))}
          </div>
        </div>
        
        {/* ✅ BOTÃO DE HISTÓRICO */}
        <div className="mt-4 flex justify-between items-center text-[10px] text-white/40 font-mono">
          <button onClick={() => setShowHistoryModal(true)} className="hover:text-primary transition-colors flex items-center gap-1.5">
            <History size={12} /> Ver Histórico de Eleições
          </button>
          <span>Tipo: {parliament?.election_type || 'Normal'}</span>
        </div>
      </div>

      {/* Projetos de Lei */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
            <FileText size={16} /> Ações Legislativas
          </h2>
          <button 
            onClick={() => { setShowLawModal(true); setSelectedLaw(null); setLawTarget({}); }}
            className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded transition-colors"
          >
            + Propor Lei
          </button>
        </div>
        
        <div className="text-center py-8 border border-white/5 bg-black/20 rounded-lg flex flex-col items-center justify-center">
          {!isDemocracy ? (
            <>
              <p className="text-red-400 text-sm font-bold mb-1">Regime Autoritário</p>
              <p className="text-white/40 text-xs">Leis são aplicadas imediatamente sem votação.</p>
            </>
          ) : hasCoalitionMajority() ? (
            <>
              <p className="text-green-400 text-sm font-bold mb-1">Sua coalizão tem maioria!</p>
              <p className="text-white/40 text-xs">Você pode aprovar leis livremente.</p>
            </>
          ) : (
            <>
              <p className="text-red-400 text-sm font-bold mb-1">A oposição tem maioria.</p>
              <p className="text-white/40 text-xs">Aprovar leis exigirá forçar a votação.</p>
            </>
          )}
        </div>
      </div>

      {/* MODAL DE LEIS DINÂMICO */}
      {showLawModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a2e] border border-surface-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            
            <div className="flex justify-between items-center p-4 border-b border-surface-border">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                {selectedLaw ? (
                  <button onClick={() => setSelectedLaw(null)} className="mr-2 hover:bg-white/10 p-1 rounded transition-colors"><ArrowLeft size={18}/></button>
                ) : <FileText size={20} className="text-primary" />}
                {selectedLaw ? selectedLaw.name : 'Catálogo de Leis'}
              </h3>
              <button onClick={() => setShowLawModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
              
              {!selectedLaw ? (
                filteredCatalog.length === 0 ? (
                  <p className="text-white/50 text-center">Nenhuma lei disponível no catálogo.</p>
                ) : (
                  filteredCatalog.map(law => (
                    <div key={law.id} className="bg-black/30 border border-surface-border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <p className="text-white font-bold text-sm">{law.name}</p>
                        <p className="text-white/50 text-xs mt-1">{law.description}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedLaw(law)}
                        className="bg-primary/20 hover:bg-primary/40 text-primary text-xs font-bold px-4 py-2 rounded-lg transition-colors shrink-0"
                      >
                        Selecionar
                      </button>
                    </div>
                  ))
                )
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex gap-3 text-sm text-primary-light">
                    <Info size={20} className="shrink-0" />
                    <p>{LAW_EXPLANATIONS[selectedLaw.id] || selectedLaw.description}</p>
                  </div>

                  {[2, 3, 13].includes(selectedLaw.id) && (
                    <div>
                      <label className="text-xs text-white/50 uppercase font-mono mb-1 block">
                        {selectedLaw.id === 2 ? 'Novo Nome' : selectedLaw.id === 3 ? 'Nome da Nova Região' : 'Novo Regime'}
                      </label>
                      <input type="text" className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm focus:border-primary focus:outline-none" onChange={e => setLawTarget({ ...lawTarget, text: e.target.value })} />
                    </div>
                  )}

                  {selectedLaw.id === 1 && (
                    <div>
                      <label className="text-xs text-white/50 uppercase font-mono mb-1 block">Guerra Ativa</label>
                      <select className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm focus:border-primary focus:outline-none" onChange={e => setLawTarget({ ...lawTarget, warId: e.target.value })}>
                        <option value="">Selecione...</option>
                        {activeWars.map(w => (
                          <option key={w.id} value={w.id}>{w.attacker?.name} vs {w.defender?.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedLaw.id === 4 && (
                    <div>
                      <label className="text-xs text-white/50 uppercase font-mono mb-1 block">Nova Capital (Sua Região)</label>
                      <select className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm focus:border-primary focus:outline-none" onChange={e => setLawTarget({ ...lawTarget, regionId: e.target.value })}>
                        <option value="">Selecione...</option>
                        {myRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  )}

                  {selectedLaw.id === 8 && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs text-white/50 uppercase font-mono mb-1 block">País Alvo</label>
                        <select className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm focus:border-primary focus:outline-none" onChange={e => setLawTarget({ ...lawTarget, countryId: Number(e.target.value), enemyRegionId: '' })}>
                          <option value="">Selecione o país...</option>
                          {allCountries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-white/50 uppercase font-mono mb-1 block">Sua Região Atacante</label>
                        <select className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm focus:border-primary focus:outline-none" onChange={e => setLawTarget({ ...lawTarget, regionId: e.target.value })}>
                          <option value="">Selecione sua região...</option>
                          {myRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-white/50 uppercase font-mono mb-1 block">Região do Inimigo (Alvo)</label>
                        <select disabled={!lawTarget.countryId} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm focus:border-primary focus:outline-none disabled:opacity-50" onChange={e => setLawTarget({ ...lawTarget, enemyRegionId: e.target.value })}>
                          <option value="">Selecione a região inimiga...</option>
                          {enemyRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        {!lawTarget.countryId && <p className="text-[10px] text-white/40 mt-1">Escolha o país alvo primeiro.</p>}
                      </div>
                    </div>
                  )}

                  {[9, 10, 12].includes(selectedLaw.id) && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs text-white/50 uppercase font-mono mb-1 block">País Alvo</label>
                        <select className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm focus:border-primary focus:outline-none" onChange={e => setLawTarget({ ...lawTarget, countryId: Number(e.target.value) })}>
                          <option value="">Selecione o país...</option>
                          {allCountries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      {selectedLaw.id === 12 && (
                        <div>
                          <label className="text-xs text-white/50 uppercase font-mono mb-1 block">Sua Região a ser Transferida</label>
                          <select className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm focus:border-primary focus:outline-none" onChange={e => setLawTarget({ ...lawTarget, regionId: e.target.value })}>
                            <option value="">Selecione sua região...</option>
                            {myRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedLaw.id === 11 && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs text-white/50 uppercase font-mono mb-1 block">Guerra</label>
                        <select className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm focus:border-primary focus:outline-none" onChange={e => setLawTarget({ ...lawTarget, warId: e.target.value })}>
                          <option value="">Selecione...</option>
                          {activeWars.map(w => <option key={w.id} value={w.id}>{w.attacker?.name} vs {w.defender?.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-white/50 uppercase font-mono mb-1 block">Lado</label>
                        <select className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm focus:border-primary focus:outline-none" onChange={e => setLawTarget({ ...lawTarget, text: e.target.value })}>
                          <option value="">Selecione...</option>
                          <option value="attacker">Atacante</option>
                          <option value="defender">Defensor</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedLaw.id === 17 && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs text-white/50 uppercase font-mono mb-1 block">Tipo de Imposto</label>
                        <select className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm focus:border-primary focus:outline-none" onChange={e => setLawTarget({ ...lawTarget, taxType: e.target.value })}>
                          <option value="">Selecione...</option>
                          <option value="income_tax">Imposto de Renda</option>
                          <option value="property_tax">Imposto Predial</option>
                          <option value="manufacturing_tax">Imposto Manufatureiro</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-white/50 uppercase font-mono mb-1 block">Valor (%)</label>
                        <input type="number" min={1} max={60} placeholder="Ex: 15" className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm focus:border-primary focus:outline-none" onChange={e => setLawTarget({ ...lawTarget, taxValue: Number(e.target.value) })} />
                      </div>
                    </div>
                  )}

                  {isDemocracy && currentForceCost && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400 mt-2">
                      <p className="font-bold mb-1 flex items-center gap-1"><ShieldAlert size={14}/> Custo para Forçar (se a oposição tiver maioria)</p>
                      <ul className="list-disc pl-4 font-mono">
                        <li>R$ {currentForceCost.money.toLocaleString()} em Dinheiro</li>
                        <li>{currentForceCost.gold} de Ouro</li>
                        <li>-{currentForceCost.governability}% de Governabilidade</li>
                      </ul>
                    </div>
                  )}

                  <button 
                    onClick={handleProposeSubmit}
                    disabled={proposingLawId === selectedLaw.id}
                    className="mt-4 bg-primary hover:bg-primary-light disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {proposingLawId === selectedLaw.id ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar e Propor'}
                  </button>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL: HISTÓRICO DE ELEIÇÕES */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a2e] border border-surface-border rounded-xl w-full max-w-md flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-surface-border">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <History size={20} className="text-primary" /> Histórico de Eleições
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 flex flex-col gap-3 custom-scrollbar max-h-[60vh] overflow-y-auto">
              {/* Aqui você pode mapear um array real se criar a tabela no futuro */}
              <div className="bg-black/30 border border-surface-border rounded-lg p-3 flex flex-col gap-2">
                <div className="flex justify-between text-[10px] text-white/40 font-mono uppercase">
                  <span>{parliament?.last_election_at ? new Date(parliament.last_election_at).toLocaleDateString() : 'Data Desconhecida'}</span>
                  <span className="text-primary">{parliament?.election_type === 'random' ? 'Aleatória' : 'Normal'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-400 text-xs font-bold">{coalitionName}: {coalition}</span>
                  <span className="text-red-400 text-xs font-bold">{oppositionName}: {opposition}</span>
                </div>
                <p className="text-[9px] text-white/30 text-center mt-1 italic">Última eleição registrada.</p>
              </div>

              <div className="bg-black/10 border border-surface-border/50 rounded-lg p-3 opacity-50 flex flex-col gap-2">
                <div className="flex justify-between text-[10px] text-white/40 font-mono uppercase">
                  <span>Há 3 dias</span>
                  <span className="text-white/40">Normal</span>
                </div>
                <div className="flex justify-between items-center text-white/40">
                  <span className="text-xs font-bold">{coalitionName}: {Math.max(0, coalition - 5)}</span>
                  <span className="text-xs font-bold">{oppositionName}: {Math.min(total, opposition + 5)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}