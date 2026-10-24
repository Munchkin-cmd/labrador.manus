'use client'

import { useState, useEffect, useRef } from 'react'
import { useCountry } from '@/hooks/useCountry'
import { useParliament } from '@/hooks/useParliament'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import { formatMoney, formatNumber, formatPopulation } from '@/utils/format'
import TrustBar from '@/components/home/TrustBar'

import {
  Map,
  Flag,
  Landmark,
  Users,
  Coins,
  TrendingUp,
  TrendingDown,
  Shield,
  Gavel,
  Radiation,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react'

import {
  IoPeople,
  IoDisc,
  IoShield,
  IoAirplane,
  IoCog,
  IoBug,
  IoRocket,
  IoNuclear,
  IoFlame,
} from 'react-icons/io5'

export default function StatePage() {
  const { country: myCountry } = useAuthStore()
  const { data, economy, profile, loading: loadingC, refetch: refetchCountry } = useCountry()
  const {
    parliament,
    laws,
    catalog,
    loading: loadingP,
    proposeLaw,
    forceLawApproval,
    lastLawResult,
    refetch: refetchParliament,
  } = useParliament()

  // ─── PAINÉIS EXPANSÍVEIS ────────────────────────────────
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
    activeLaws: false,
    regions: false,
  })

  const togglePanel = (panel: string) => {
    setExpandedPanels(prev => ({ ...prev, [panel]: !prev[panel] }))
  }

  // ─── FORÇA RECARREGAMENTO QUANDO A PÁGINA ABRE ──────────
  useEffect(() => {
    refetchCountry()
    refetchParliament()
  }, [refetchCountry, refetchParliament])

  // ─── XP DE COMBATE ──────────────────────────────────────
  const [combatXP, setCombatXP] = useState<{ experience: number; wars_participated: number } | null>(null)
  const [loadingXP, setLoadingXP] = useState(true)

  useEffect(() => {
    async function fetchCombatXP() {
      if (!myCountry?.id) {
        setCombatXP(null)
        setLoadingXP(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('combat_xp')
          .select('experience, wars_participated')
          .eq('country_id', myCountry.id)
          .maybeSingle()

        if (error) throw error

        if (data) {
          setCombatXP({
            experience: data.experience ?? 0,
            wars_participated: data.wars_participated ?? 0,
          })
        } else {
          setCombatXP(null)
        }
      } catch (err) {
        console.error('❌ Erro ao buscar XP de combate:', err)
      } finally {
        setLoadingXP(false)
      }
    }

    fetchCombatXP()
  }, [myCountry?.id])

  // ─── BANNER ──────────────────────────────────────────────
  const [bannerIndex, setBannerIndex] = useState(0)
  const bannerImages = profile?.banner_urls || []
  const hasBanner = bannerImages.length > 0
  const bannerContainerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const startTimer = () => {
    stopTimer()
    if (hasBanner && bannerImages.length > 1) {
      intervalRef.current = setInterval(() => {
        setBannerIndex(prev => (prev + 1) % bannerImages.length)
      }, 3000)
    }
  }

  useEffect(() => {
    startTimer()
    return () => stopTimer()
  }, [bannerImages.length])

  const goToSlide = (index: number) => {
    setBannerIndex(index)
    stopTimer()
    startTimer()
  }

  const goNext = () => {
    setBannerIndex(prev => (prev + 1) % bannerImages.length)
    stopTimer()
    startTimer()
  }

  const goPrev = () => {
    setBannerIndex(prev => (prev - 1 + bannerImages.length) % bannerImages.length)
    stopTimer()
    startTimer()
  }

  const handleBannerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!bannerContainerRef.current || bannerImages.length <= 1) return

    const rect = bannerContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const center = rect.width / 2

    if (x < center) goPrev()
    else goNext()
  }

  // ─── DADOS MILITARES ──────────────────────────────────
  const [military, setMilitary] = useState<any>(null)
  const [loadingMil, setLoadingMil] = useState(true)

  useEffect(() => {
    async function fetchMilitary() {
      if (!myCountry?.id) {
        setLoadingMil(false)
        return
      }

      try {
        const { data } = await supabase
          .from('military')
          .select('soldiers, tanks, artillery, aircraft, helicopters, drones, ships, submarines, missiles, warheads, ammunition')
          .eq('country_id', myCountry.id)
          .maybeSingle()

        setMilitary(data || null)
      } catch (err) {
        console.error('❌ Erro ao buscar dados militares:', err)
      } finally {
        setLoadingMil(false)
      }
    }

    fetchMilitary()
  }, [myCountry?.id])

  // ─── REGIÕES ──────────────────────────────────────────
  const [regions, setRegions] = useState<any[]>([])
  const [buildingsCount, setBuildingsCount] = useState<Record<string, number>>({})

  const fetchRegions = async () => {
    if (!data?.id) return
    const currentCountryId = data.id

    const { data: regionsData, error: regionsError } = await supabase
      .from('regions')
      .select('*') 
      .eq('country_id', currentCountryId)

    if (regionsError) {
      console.error('❌ Erro ao buscar regiões:', regionsError)
      return
    }

    if (regionsData && regionsData.length > 0) {
      setRegions(regionsData)
      const regionIds = regionsData.map((r: any) => r.id)

      if (regionIds.length > 0) {
        const { data: buildingsData } = await supabase
          .from('buildings')
          .select('*')
          .in('region_id', regionIds)

        if (buildingsData) {
          const count: Record<string, number> = {}
          buildingsData.forEach((b: any) => {
            const qty = b.quantity || 1 
            count[b.region_id] = (count[b.region_id] || 0) + qty
          })
          setBuildingsCount(count)
        }
      }
    } else {
      setRegions([])
    }
  }

  useEffect(() => {
    fetchRegions()
  }, [data?.id])

  // ─── ESTADOS DO MODAL ────────────────────────────────────
  const [selectedLawId, setSelectedLawId] = useState<number | ''>('')
  const [targetCountryId, setTargetCountryId] = useState<number | null>(null)
  const [targetRegionId, setTargetRegionId] = useState<string>('')
  const [targetEnemyRegionId, setTargetEnemyRegionId] = useState<string>('')
  const [targetText, setTargetText] = useState('')
  const [taxType, setTaxType] = useState('')
  const [taxValue, setTaxValue] = useState(0)
  const [proposing, setProposing] = useState(false)
  const [lawMsg, setLawMsg] = useState('')
  const [showLawModal, setShowLawModal] = useState(false)
  const [forcing, setForcing] = useState<string | null>(null)
  const [forceMsg, setForceMsg] = useState('')

  // ─── PAÍSES, GUERRAS ATIVAS, REGIÕES DO INIMIGO E SANCIONADOS ──
  const [countries, setCountries] = useState<any[]>([])
  const [activeWars, setActiveWars] = useState<any[]>([])
  const [enemyRegions, setEnemyRegions] = useState<any[]>([])
  const [sanctionedCountries, setSanctionedCountries] = useState<any[]>([])

  useEffect(() => {
    if (!data?.id) return
    const currentCountryId = data.id

    async function fetchAuxData() {
      try {
        // 1. Todos os países
        const { data: cData } = await supabase
          .from('countries')
          .select('id, name, flag_emoji')
        setCountries(cData || [])

        // 2. TODAS as guerras ativas (não apenas as minhas)
        const { data: wData } = await supabase
          .from('wars')
          .select('id, attacker_id, defender_id, status, attacker:countries!wars_attacker_id_fkey(name), defender:countries!wars_defender_id_fkey(name)')
          .eq('status', 'active')

        const formatted = (wData || []).map((w: any) => ({
          id: w.id,
          attacker_id: w.attacker_id,
          defender_id: w.defender_id,
          attacker_name: w.attacker?.name,
          defender_name: w.defender?.name,
          side: w.attacker_id === currentCountryId ? 'attacker' : 'defender',
        }))

        setActiveWars(formatted)

        // 3. Países que EU sancionei
        const { data: diploData } = await supabase
          .from('diplomacy')
          .select('country_a_id, country_b_id')
          .eq('sanctions_active', true)
          .or(`country_a_id.eq.${currentCountryId},country_b_id.eq.${currentCountryId}`)

        if (diploData && diploData.length > 0) {
          const sanctionedIds = diploData.map((d: any) =>
            d.country_a_id === currentCountryId ? d.country_b_id : d.country_a_id
          )
          const filtered = (cData || []).filter((c: any) => sanctionedIds.includes(c.id))
          setSanctionedCountries(filtered)
        } else {
          setSanctionedCountries([])
        }
      } catch (err) {
        console.error('Erro ao buscar dados auxiliares:', err)
      }
    }

    fetchAuxData()
  }, [data?.id])

  // ✅ Buscar regiões do país alvo quando ele for selecionado
  useEffect(() => {
    if (!targetCountryId) {
      setEnemyRegions([])
      setTargetEnemyRegionId('')
      return
    }

    const enemyCountryId = targetCountryId

    async function fetchEnemyRegions() {
      const { data: rData } = await supabase
        .from('regions')
        .select('id, name')
        .eq('country_id', enemyCountryId)

      setEnemyRegions(rData || [])
      setTargetEnemyRegionId('')
    }

    fetchEnemyRegions()
  }, [targetCountryId])

  // ─── TIMER DE ELEIÇÕES ──────────────────────────────────
  const [timeLeft, setTimeLeft] = useState<string>('06:00:00')

  useEffect(() => {
    const updateTimer = () => {
      if (!parliament?.last_random_at) {
        setTimeLeft('06:00:00')
        return
      }

      const lastElection = new Date(parliament.last_random_at).getTime()
      const nextElection = lastElection + 6 * 60 * 60 * 1000
      const now = new Date().getTime()
      const diff = nextElection - now

      if (diff <= 0) {
        setTimeLeft('00:00:00')
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        
        setTimeLeft(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        )
      }
    }

    updateTimer()
    const timerId = setInterval(updateTimer, 1000)

    return () => clearInterval(timerId)
  }, [parliament?.last_random_at])

  // ─── ESTADOS DE CARREGAMENTO ─────────────────────────────
  if (loadingC || loadingP) return <PageLoading />

  if (!data || !economy) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <p className="text-white/60 text-sm font-mono uppercase tracking-widest">DADOS DO PAÍS INDISPONÍVEIS.</p>
        <button onClick={() => window.location.reload()} className="mt-4 btn-primary text-sm py-2 px-4">
          Recarregar
        </button>
      </div>
    )
  }

  // ─── CÁLCULOS ────────────────────────────────────────
  const coalition_pct = parliament
    ? Math.round((parliament.coalition_seats / parliament.total_seats) * 100)
    : 0
  const has_majority = parliament
    ? parliament.coalition_seats > parliament.total_seats / 2
    : false

  let parlamentoStatus = '📊 Parlamento Equilibrado'
  if (has_majority) parlamentoStatus = '🟢 Parlamento Majoritário (Coalizão)'
  else parlamentoStatus = '🔴 Parlamento Minoritário (Oposição)'

  // ─── LEIS ──────────────────────────────────────────────
  const selectedLaw = catalog.find(l => l.id === selectedLawId)
  const activeLaws = laws.filter(l => l.status === 'active')

  // ─── FUNÇÕES ──────────────────────────────────────────
  async function handlePropose() {
    if (!selectedLawId) return

    setProposing(true)
    setLawMsg('')

    const target = {
      countryId: targetCountryId || undefined,
      regionId: targetRegionId || undefined,
      enemyRegionId: targetEnemyRegionId || undefined,
      warId: targetRegionId || undefined,
      text: targetText || undefined,
      taxType: taxType || undefined,
      taxValue: taxValue || undefined,
    }

    const res = await proposeLaw(Number(selectedLawId), target)
    setLawMsg(res.message ?? res.error ?? 'Erro')

    if (res.success) {
      setShowLawModal(false)
      setSelectedLawId('')
      setTargetCountryId(null)
      setTargetRegionId('')
      setTargetEnemyRegionId('')
      setTargetText('')
      setTaxType('')
      setTaxValue(0)
      
      refetchCountry()
      refetchParliament()
    }

    setProposing(false)
  }

  async function handleForce() {
    if (!selectedLawId) return

    setForcing(String(selectedLawId))
    setForceMsg('')

    const target = {
      countryId: targetCountryId || undefined,
      regionId: targetRegionId || undefined,
      enemyRegionId: targetEnemyRegionId || undefined,
      warId: targetRegionId || undefined,
      text: targetText || undefined,
      taxType: taxType || undefined,
      taxValue: taxValue || undefined,
    }

    const res = await forceLawApproval(Number(selectedLawId), target)
    setForceMsg(res.message ?? res.error ?? 'Erro')

    if (res.success) {
      setShowLawModal(false)
      setSelectedLawId('')
      setTargetCountryId(null)
      setTargetRegionId('')
      setTargetEnemyRegionId('')
      setTargetText('')
      setTaxType('')
      setTaxValue(0)

      refetchCountry()
      refetchParliament()
    }

    setForcing(null)
  }

  // ─── RENDER ──────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 pb-8 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-14">

      {/* ─── BANNER ─────────────────────────────────────── */}
      <div
        ref={bannerContainerRef}
        onClick={handleBannerClick}
        className={`relative h-56 sm:h-64 w-full overflow-hidden rounded-xl bg-surface-card border border-surface-border shadow-lg ${hasBanner && bannerImages.length > 1 ? 'cursor-pointer' : ''}`}
      >
        {hasBanner ? (
          <>
            <img
              src={bannerImages[bannerIndex]}
              alt="Banner do país"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
            />
            {bannerImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {bannerImages.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={e => {
                      e.stopPropagation()
                      goToSlide(idx)
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === bannerIndex ? 'bg-primary w-4' : 'bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs font-mono tracking-widest uppercase">
            Nenhuma foto no banner
          </div>
        )}
      </div>

      {/* ─── CABEÇALHO ──────────────────────────────────── */}
      <div className="mt-2 px-2 flex items-center justify-between gap-4">
        
        {/* Bandeira (Esquerda) */}
        <div className="w-28 h-20 sm:w-32 sm:h-24 rounded-lg border-2 border-surface-border shadow-xl overflow-hidden shrink-0 bg-surface-input flex items-center justify-center">
          {profile?.flag_url ? (
            <img src={profile.flag_url} alt={data.name} className="w-full h-full object-cover" />
          ) : (
            <Flag size={48} className="text-white/30" />
          )}
        </div>

        {/* Nome, Capital e Lema (Direita) - ✅ CORRIGIDO com line-clamp-2 */}
        <div className="flex flex-col items-end text-right flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-wider leading-tight line-clamp-2 break-words">
            {data.name}
          </h2>
          <p className="text-white/50 text-[11px] sm:text-xs font-mono tracking-widest mt-1">
            CAPITAL: <span className="text-white/80 font-bold">{data.capital}</span>
          </p>
          {data.motto && (
            <p className="text-white/30 text-[10px] sm:text-[11px] font-mono italic mt-1 truncate max-w-full">
              "{data.motto}"
            </p>
          )}
        </div>
      </div>

      {/* ─── INFORMAÇÕES DO PAÍS ────────────────────────── */}
      <Section
        title={
          <span className="flex items-center gap-2">
            <Landmark size={16} /> INFORMAÇÕES
          </span>
        }
      >
        <InfoRow
          label="Título"
          value={`${data.leader_title}${data.leader_name ? ': ' + data.leader_name : ''}`}
        />
        <InfoRow label="Estrutura" value={data.state_structure || 'Democracia'} />
        <InfoRow label="Religião" value={data.religion || 'Sem religião oficial'} />
        <InfoRow label="Moeda" value={data.currency || 'NF ($)'} />
        <InfoRow
          label="Terreno"
          value={data.terrain ? data.terrain.charAt(0).toUpperCase() + data.terrain.slice(1) : 'Planície'}
        />
      </Section>

      {/* ─── REGIÕES ────────────────────────────────────── */}
      <Section
        title={
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-2">
              <Map size={16} /> REGIÕES ({regions.length})
            </span>
            <button
              onClick={() => togglePanel('regions')}
              className="text-white/40 hover:text-white transition-colors"
            >
              {expandedPanels.regions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        }
      >
        {regions.length === 0 ? (
          <p className="text-white/30 text-xs font-mono text-center py-4 uppercase">NENHUMA REGIÃO CADASTRADA</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-[10px] border-b border-surface-border font-mono tracking-widest">
                    <th className="text-left py-2 font-medium uppercase">Região</th>
                    <th className="text-right py-2 font-medium uppercase">Edifícios</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.slice(0, expandedPanels.regions ? undefined : 3).map((region: any) => (
                    <tr key={region.id} className="border-b border-surface-border last:border-0">
                      <td className="py-3 text-white font-medium text-xs uppercase tracking-wider">{region.name}</td>
                      <td className="py-3 text-primary font-bold font-mono text-right">{buildingsCount[region.id] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!expandedPanels.regions && regions.length > 3 && (
              <p className="text-white/40 text-[10px] font-mono mt-3 text-center uppercase tracking-widest">
                +{regions.length - 3} mais regiões
              </p>
            )}
          </>
        )}
      </Section>

      {/* ─── STATUS POLÍTICO ────────────────────────────── */}
      <Section
        title={
          <span className="flex items-center gap-2">
            <Shield size={16} /> STATUS POLÍTICO
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          <TrustBar trust={data.trust ?? 0} label="Confiança" color="bg-green-500" />
          <TrustBar trust={data.intl_approval ?? 0} label="Aprovação" color="bg-blue-400" />
          <TrustBar trust={data.political_power ?? 0} label="Poder Pol." color="bg-purple-400" />
          {!loadingXP && combatXP && (
            <TrustBar
              trust={Math.min(100, combatXP.experience / 10)}
              label="XP de Combate"
              color="bg-orange-500"
            />
          )}
          {!loadingXP && !combatXP && (
            <div className="text-white/30 text-[10px] font-mono text-center uppercase mt-2 tracking-widest">Sem XP de combate</div>
          )}
        </div>
      </Section>

      {/* ✅ NOVA SEÇÃO: INDICADORES SOCIOECONÔMICOS */}
      <Section
        title={
          <span className="flex items-center gap-2">
            <TrendingUp size={16} /> INDICADORES SOCIOECONÔMICOS
          </span>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <StatCard
            label="IDH"
            value={Number((economy as any).idh || 0).toFixed(3)}
            icon={<TrendingUp size={18} className="text-blue-400" />}
          />
          <StatCard
            label="Cresc. Populacional"
            value={`+${Number((economy as any).population_growth || 0).toFixed(1)}%`}
            icon={<Users size={18} className="text-green-400" />}
          />
          <StatCard
            label="Inflação"
            value={`${Number((economy as any).inflation || 0).toFixed(1)}%`}
            icon={<TrendingDown size={18} className={Number((economy as any).inflation || 0) > 10 ? 'text-red-400' : 'text-yellow-400'} />}
          />
        </div>
      </Section>

      {/* ─── PARLAMENTO VISUAL ──────────────────────────── */}
      <Section
        title={
          <span className="flex items-center gap-2">
            <Users size={16} /> PARLAMENTO
          </span>
        }
      >
        {parliament ? (
          <>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#141F35" strokeWidth="12" />
                  {(() => {
                    const radius = 54
                    const circumference = 2 * Math.PI * radius
                    const coalitionLength = (coalition_pct / 100) * circumference
                    const oppositionLength = circumference - coalitionLength

                    return (
                      <>
                        <circle
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="12"
                          strokeDasharray={`${coalitionLength} ${circumference}`}
                          strokeLinecap="butt"
                        />
                        {coalition_pct < 100 && (
                          <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            fill="none"
                            stroke="#EF4444"
                            strokeWidth="12"
                            strokeDasharray={`${oppositionLength} ${circumference}`}
                            strokeDashoffset={-coalitionLength}
                            strokeLinecap="butt"
                          />
                        )}
                      </>
                    )
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <span className="text-2xl font-bold font-mono">{parliament.total_seats}</span>
                  <span className="text-[9px] text-white/40 font-mono tracking-widest">ASSENTOS</span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-2">
                <div className="flex justify-between items-center bg-surface-input border border-surface-border p-2.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-white/60 text-[10px] font-mono tracking-widest uppercase">Coalizão</span>
                  </div>
                  <span className="text-green-400 font-bold text-sm font-mono">
                    {parliament.coalition_seats} ({coalition_pct}%)
                  </span>
                </div>

                <div className="flex justify-between items-center bg-surface-input border border-surface-border p-2.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-white/60 text-[10px] font-mono tracking-widest uppercase">Oposição</span>
                  </div>
                  <span className="text-red-400 font-bold text-sm font-mono">
                    {parliament.opposition_seats} ({100 - coalition_pct}%)
                  </span>
                </div>

                <div className="mt-3 text-center flex flex-col items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-md font-mono uppercase tracking-wider ${
                      has_majority
                        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}
                  >
                    {parlamentoStatus}
                  </span>
                  
                  {/* ⏱️ CONTADOR */}
                  <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest flex items-center gap-1.5 mt-1">
                    <Clock size={12} /> Próximas eleições em:
                  </span>
                  <span className="text-sm font-bold font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-md tracking-wider">
                    {timeLeft}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-white/40 text-xs font-mono text-center py-4 uppercase">
            DADOS DO PARLAMENTO INDISPONÍVEIS
          </p>
        )}
      </Section>

      {/* ─── PROPOR LEI ───────────────────────────────────── */}
      <Section
        title={
          <span className="flex items-center gap-2">
            <Gavel size={16} /> PROPOR LEI
          </span>
        }
      >
        <button
          onClick={() => setShowLawModal(true)}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20 uppercase tracking-wider text-sm mb-3"
        >
          <Gavel size={18} /> Propor Nova Lei
        </button>
        <p className="text-white/40 text-[10px] font-mono text-center uppercase tracking-widest">
          Confiança: <span className="text-green-400">{data.trust}%</span> · Poder Político:{' '}
          <span className="text-purple-400">{data.political_power}</span>
        </p>
      </Section>

      {/* ─── LEIS ATIVAS ────────────────────────────────── */}
      {activeLaws.length > 0 && (
        <Section
          title={
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-2">
                <Landmark size={16} /> LEIS ATIVAS ({activeLaws.length})
              </span>
              <button
                onClick={() => togglePanel('activeLaws')}
                className="text-white/40 hover:text-white transition-colors"
              >
                {expandedPanels.activeLaws ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-2">
            {activeLaws
              .slice(0, expandedPanels.activeLaws ? undefined : 3)
              .map(law => (
                <div key={law.id} className="bg-surface-input border border-surface-border rounded-lg p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-bold text-xs uppercase tracking-wider">{law.law_catalog?.name}</p>
                    <p className="text-white/40 text-[10px] font-mono mt-0.5">
                      {law.forced_approval
                        ? '⚡ FORÇADA'
                        : '✅ APROVADA'}
                    </p>
                  </div>
                  <span className="text-[9px] bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Ativa</span>
                </div>
              ))}
            {!expandedPanels.activeLaws && activeLaws.length > 3 && (
              <button
                onClick={() => togglePanel('activeLaws')}
                className="w-full mt-1 text-[10px] text-white/40 font-mono hover:text-white uppercase flex items-center justify-center gap-1 transition-colors"
              >
                +{activeLaws.length - 3} mais leis <ChevronDown size={12} />
              </button>
            )}
          </div>
        </Section>
      )}

      {/* ─── ECONOMIA ────────────────────────────────────── */}
      <Section
        title={
          <span className="flex items-center gap-2">
            <Coins size={16} /> ESTATÍSTICAS ECONÔMICAS
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label="Dinheiro"
            value={formatMoney(Number(economy.money || 0))}
            icon={<Coins size={18} />}
          />
          <StatCard
            label="Exportação"
            value={formatMoney(Number(economy.exports || 0))}
            icon={<TrendingUp size={18} />}
          />
          <StatCard
            label="Importação"
            value={formatMoney(Number(economy.imports || 0))}
            icon={<TrendingDown size={18} />}
          />
          <StatCard
            label="Receitas"
            value={formatMoney(Number(economy.revenue || 0))}
            icon={<TrendingUp size={18} />}
          />
          <StatCard
            label="Despesas"
            value={formatMoney(Number(economy.expenses || 0))}
            icon={<TrendingDown size={18} />}
          />
          <StatCard
            label="População"
            value={formatPopulation(Number(economy.population || 0))}
            icon={<Users size={18} />}
          />
          <StatCard
            label="Poluição"
            value={`${Number(economy.pollution || 0).toFixed(0)}%`}
            icon={<Radiation size={18} />}
          />
        </div>
      </Section>

      {/* ─── MILITAR ────────────────────────────────────── */}
      <Section
        title={
          <span className="flex items-center gap-2">
            <Shield size={16} /> EQUIPAMENTOS MILITARES
          </span>
        }
      >
        {loadingMil ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: <IoPeople size={20} />, label: 'SOLDADOS', key: 'soldiers' },
              { icon: <IoDisc size={20} />, label: 'MUNIÇÃO', key: 'ammunition' },
              { icon: <IoShield size={20} />, label: 'TANQUES', key: 'tanks' },
              { icon: <IoAirplane size={20} />, label: 'AERONAVES', key: 'aircraft' },
              { icon: <IoCog size={20} />, label: 'HELICÓPTEROS', key: 'helicopters' },
              { icon: <IoBug size={20} />, label: 'DRONES', key: 'drones' },
              { icon: <IoRocket size={20} />, label: 'MÍSSEIS', key: 'missiles' },
              { icon: <IoNuclear size={20} />, label: 'OGIVAS', key: 'warheads' },
              { icon: <IoFlame size={20} />, label: 'ARTILHARIA', key: 'artillery' },
            ].map(({ icon, label, key }) => (
              <div key={key} className="bg-surface-input border border-surface-border rounded-lg p-2.5 flex flex-col items-center gap-1">
                <span className="text-white/40">{icon}</span>
                <span className="text-white font-bold text-sm font-mono">
                  {formatNumber(Number(military?.[key] ?? 0))}
                </span>
                <span className="text-white/40 text-[9px] font-mono tracking-widest uppercase">{label}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ─── MODAL DE PROPOR LEI ─────────────────────────── */}
      {showLawModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card border border-surface-border rounded-xl p-5 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg flex items-center gap-2 uppercase tracking-widest font-mono">
                <Gavel size={18} className="text-primary" /> Propor Lei
              </h3>
              <button
                onClick={() => {
                  setShowLawModal(false)
                  setSelectedLawId('')
                  setLawMsg('')
                  setForceMsg('')
                }}
                className="text-white/40 hover:text-white bg-white/5 p-1.5 rounded-md transition-colors"
              >
                <ChevronDown size={18} className="rotate-180" />
              </button>
            </div>

            <select
              value={selectedLawId}
              onChange={e => {
                const val = Number(e.target.value)
                setSelectedLawId((val as any) || '')
                setTargetCountryId(null)
                setTargetRegionId('')
                setTargetEnemyRegionId('')
                setTargetText('')
                setTaxType('')
                setTaxValue(0)
                setLawMsg('')
                setForceMsg('')
              }}
              className="input-field mb-4 w-full bg-surface-input"
            >
              <option value="">SELECIONE UMA LEI...</option>
              {catalog.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.political_power_cost} PP {l.requires_parliament ? '(🗳️)' : '(⚡ Direta)'}
                </option>
              ))}
            </select>

            {selectedLaw && (
              <div className="bg-surface-input border border-surface-border rounded-lg p-4 mb-4 space-y-3">
                <p className="text-white/60 text-xs font-mono leading-relaxed">{selectedLaw.description}</p>

                {/* Lei 1: Propor Paz */}
                {selectedLaw.id === 1 && (
                  <select
                    value={targetRegionId}
                    onChange={e => setTargetRegionId(e.target.value)}
                    className="input-field text-sm w-full bg-[#0A0F1C]"
                  >
                    <option value="">Escolha a guerra...</option>
                    {activeWars
                      .filter(w => w.attacker_id === data.id || w.defender_id === data.id)
                      .map(w => (
                        <option key={w.id} value={w.id}>
                          vs {w.attacker_name} vs {w.defender_name}
                        </option>
                      ))}
                  </select>
                )}

                {/* Lei 2: Alterar Nome */}
                {selectedLaw.id === 2 && (
                  <input
                    type="text"
                    placeholder="Novo nome do país"
                    value={targetText}
                    onChange={e => setTargetText(e.target.value)}
                    className="input-field text-sm w-full bg-[#0A0F1C]"
                  />
                )}

                {/* Lei 3: Criar Região */}
                {selectedLaw.id === 3 && (
                  <input
                    type="text"
                    placeholder="Nome da nova região"
                    value={targetText}
                    onChange={e => setTargetText(e.target.value)}
                    className="input-field text-sm w-full bg-[#0A0F1C]"
                  />
                )}

                {/* Lei 4: Transferir Capital */}
                {selectedLaw.id === 4 && (
                  <select
                    value={targetRegionId}
                    onChange={e => setTargetRegionId(e.target.value)}
                    className="input-field text-sm w-full bg-[#0A0F1C]"
                  >
                    <option value="">Escolha a nova capital...</option>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Lei 8: Declarar Guerra */}
                {selectedLaw.id === 8 && (
                  <>
                    <label className="text-white/40 text-[10px] font-mono uppercase block">País alvo</label>
                    <select
                      value={targetCountryId || ''}
                      onChange={e => setTargetCountryId(Number(e.target.value) || null)}
                      className="input-field text-sm w-full bg-[#0A0F1C]"
                    >
                      <option value="">Escolha o país alvo...</option>
                      {countries
                        .filter(c => c.id !== data.id)
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>

                    <label className="text-white/40 text-[10px] font-mono uppercase block mt-2">Minha região (origem do ataque)</label>
                    <select
                      value={targetRegionId}
                      onChange={e => setTargetRegionId(e.target.value)}
                      className="input-field text-sm w-full bg-[#0A0F1C]"
                    >
                      <option value="">Escolha sua região...</option>
                      {regions.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>

                    <label className="text-white/40 text-[10px] font-mono uppercase block mt-2">Região do inimigo (alvo)</label>
                    <select
                      value={targetEnemyRegionId}
                      onChange={e => setTargetEnemyRegionId(e.target.value)}
                      className="input-field text-sm w-full bg-[#0A0F1C]"
                      disabled={!targetCountryId || enemyRegions.length === 0}
                    >
                      <option value="">
                        {!targetCountryId
                          ? 'Escolha o país alvo primeiro...'
                          : enemyRegions.length === 0
                          ? 'Sem regiões disponíveis'
                          : 'Escolha a região alvo...'}
                      </option>
                      {enemyRegions.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {/* Lei 9: Livre Comércio */}
                {selectedLaw.id === 9 && (
                  <>
                    <p className="text-white/40 text-[10px] font-mono uppercase">
                      Escolha um país que você sancionou para propor livre comércio.
                    </p>
                    <select
                      value={targetCountryId || ''}
                      onChange={e => setTargetCountryId(Number(e.target.value) || null)}
                      className="input-field text-sm w-full bg-[#0A0F1C]"
                    >
                      <option value="">
                        {sanctionedCountries.length === 0
                          ? 'Você não sancionou nenhum país'
                          : 'Escolha um país sancionado...'}
                      </option>
                      {sanctionedCountries.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {sanctionedCountries.length === 0 && (
                      <p className="text-yellow-400/60 text-[10px] mt-1">
                        ⚠️ Só é possível propor Livre Comércio para países que você sancionou.
                      </p>
                    )}
                  </>
                )}

                {/* Lei 10: Aplicar Sanções */}
                {selectedLaw.id === 10 && (
                  <select
                    value={targetCountryId || ''}
                    onChange={e => setTargetCountryId(Number(e.target.value) || null)}
                    className="input-field text-sm w-full bg-[#0A0F1C]"
                  >
                    <option value="">Escolha o país alvo...</option>
                    {countries
                      .filter(c => c.id !== data.id)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                )}

                {/* Lei 11: Participar de Guerra */}
                {selectedLaw.id === 11 && (
                  <>
                    <p className="text-white/40 text-[10px] font-mono uppercase">
                      Escolha qualquer guerra ativa e o lado que você quer apoiar.
                    </p>
                    <select
                      value={targetRegionId}
                      onChange={e => setTargetRegionId(e.target.value)}
                      className="input-field text-sm w-full bg-[#0A0F1C]"
                    >
                      <option value="">Escolha a guerra...</option>
                      {activeWars.length === 0 ? (
                        <option value="" disabled>
                          Nenhuma guerra ativa no mundo
                        </option>
                      ) : (
                        activeWars.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.attacker_name} vs {w.defender_name}
                          </option>
                        ))
                      )}
                    </select>
                    <select
                      value={targetText}
                      onChange={e => setTargetText(e.target.value)}
                      className="input-field text-sm w-full bg-[#0A0F1C]"
                    >
                      <option value="">Escolha o lado...</option>
                      <option value="attacker">Apoiar o ATACANTE</option>
                      <option value="defender">Apoiar o DEFENSOR</option>
                    </select>
                  </>
                )}

                {/* Lei 12: Transferir Região */}
                {selectedLaw.id === 12 && (
                  <>
                    <select
                      value={targetRegionId}
                      onChange={e => setTargetRegionId(e.target.value)}
                      className="input-field text-sm w-full bg-[#0A0F1C]"
                    >
                      <option value="">Sua região...</option>
                      {regions.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={targetCountryId || ''}
                      onChange={e => setTargetCountryId(Number(e.target.value) || null)}
                      className="input-field text-sm w-full bg-[#0A0F1C]"
                    >
                      <option value="">País destino...</option>
                      {countries
                        .filter(c => c.id !== data.id)
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </>
                )}

                {/* Lei 13: Alterar Regime */}
                {selectedLaw.id === 13 && (
                  <input
                    type="text"
                    placeholder="Novo regime (ex: Monarquia Parlamentar)"
                    value={targetText}
                    onChange={e => setTargetText(e.target.value)}
                    className="input-field text-sm w-full bg-[#0A0F1C]"
                  />
                )}

                {/* Lei 17: Alterar Impostos */}
                {selectedLaw.id === 17 && (
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={taxType}
                      onChange={e => setTaxType(e.target.value)}
                      className="input-field text-sm bg-[#0A0F1C]"
                    >
                      <option value="">Tipo...</option>
                      <option value="income_tax">Renda</option>
                      <option value="property_tax">Propriedade</option>
                      <option value="manufacturing_tax">Manufatura</option>
                    </select>
                    <input
                      type="number"
                      placeholder="% (máx 60)"
                      value={taxValue}
                      onChange={e => setTaxValue(Number(e.target.value))}
                      min="0"
                      max="60"
                      className="input-field text-sm bg-[#0A0F1C]"
                    />
                  </div>
                )}
              </div>
            )}

            {lawMsg && (
              <p
                className={`text-xs text-center mb-2 font-mono ${
                  lawMsg.includes('sucesso') ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {lawMsg}
              </p>
            )}

            {forceMsg && (
              <p
                className={`text-xs text-center mb-2 font-mono ${
                  forceMsg.includes('sucesso') ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {forceMsg}
              </p>
            )}

            {lastLawResult && lastLawResult.requiresForce && !lastLawResult.success && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3 text-center">
                <p className="text-yellow-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  ⚠️ Oposição tem maioria. Você pode forçar a aprovação!
                </p>
                <button
                  onClick={handleForce}
                  disabled={
                    forcing === String(selectedLawId) ||
                    (data?.political_power ?? 0) < (lastLawResult.forceCost ?? 0)
                  }
                  className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-30 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                >
                  {forcing === String(selectedLawId)
                    ? 'Forçando...'
                    : `⚡ Forçar Aprovação (${lastLawResult.forceCost} PP)`}
                </button>
              </div>
            )}

            <div className="flex gap-3 mt-4 border-t border-surface-border pt-4">
              <button
                onClick={handlePropose}
                disabled={!selectedLawId || proposing}
                className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-30 text-white font-bold py-2.5 rounded-lg transition-colors"
              >
                {proposing ? 'Propondo...' : 'Propor Lei'}
              </button>
              <button
                onClick={() => {
                  setShowLawModal(false)
                  setSelectedLawId('')
                  setLawMsg('')
                }}
                className="flex-1 bg-surface-input border border-surface-border hover:bg-white/5 text-white font-bold py-2.5 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── COMPONENTES AUXILIARES ──────────────────────────────
function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-2 pl-1 w-full">
        <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0" />
        <div className="text-xs font-bold text-white uppercase tracking-widest flex-1 flex items-center justify-between">
          {title}
        </div>
      </div>
      <div className="bg-surface-card border border-surface-border rounded-lg p-4 sm:p-5 shadow-lg">
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-surface-border last:border-0">
      <span className="text-white/40 text-[11px] font-mono uppercase tracking-wider">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-surface-input border border-surface-border rounded-lg p-3 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {icon && <span className="text-primary/60">{icon}</span>}
        <span className="text-white font-bold font-mono text-sm">{value}</span>
      </div>
      <span className="text-white/40 text-[9px] font-mono tracking-widest uppercase">{label}</span>
    </div>
  )
}

function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}