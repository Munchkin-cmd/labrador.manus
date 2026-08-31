
'use client'

import { useState, useEffect, useRef } from 'react'
import { useCountry } from '@/hooks/useCountry'
import { useParliament } from '@/hooks/useParliament'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import { formatMoney, formatNumber, formatPopulation } from '@/utils/format'
import TrustBar from '@/components/home/TrustBar'

import {
  Map, Plus, Flag, Crown,
  Landmark, Users, Coins, TrendingUp, TrendingDown,
  Shield, Gavel, Radiation
} from 'lucide-react'

import {
  IoPeople, IoDisc, IoShield, IoAirplane, IoCog,
  IoBug, IoRocket, IoNuclear, IoFlame
} from 'react-icons/io5'

export default function StatePage() {
  const { country: myCountry } = useAuthStore()
  const { data, economy, profile, loading: loadingC } = useCountry()
  const {
    parliament,
    laws,
    catalog,
    loading: loadingP,
    proposeLaw,
    forceLaw,
    nextElectionIn,
    nextRandomIn,
    getCountdown,
  } = useParliament()

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
        setBannerIndex((prev) => (prev + 1) % bannerImages.length)
      }, 7000)
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
    setBannerIndex((prev) => (prev + 1) % bannerImages.length)
    stopTimer()
    startTimer()
  }

  const goPrev = () => {
    setBannerIndex((prev) => (prev - 1 + bannerImages.length) % bannerImages.length)
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

    const { data: regionsData, error: regionsError } = await supabase
      .from('regions')
      .select('id, name, used_area')
      .eq('country_id', data.id)

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
          .select('region_id, quantity')
          .in('region_id', regionIds)

        if (buildingsData) {
          const count: Record<string, number> = {}
          buildingsData.forEach((b: any) => {
            count[b.region_id] = (count[b.region_id] || 0) + b.quantity
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
  const [targetText, setTargetText] = useState('')
  const [taxType, setTaxType] = useState('')
  const [taxValue, setTaxValue] = useState(0)
  const [proposing, setProposing] = useState(false)
  const [lawMsg, setLawMsg] = useState('')
  const [showLawModal, setShowLawModal] = useState(false)
  const [forcing, setForcing] = useState<string | null>(null)
  const [forceMsg, setForceMsg] = useState('')

  // ─── PAÍSES E GUERRAS ATIVAS (para selects) ──────────
  const [countries, setCountries] = useState<any[]>([])
  const [activeWars, setActiveWars] = useState<any[]>([])

  useEffect(() => {
    if (!data?.id) return

    async function fetchAuxData() {
      try {
        const { data: cData } = await supabase
          .from('countries')
          .select('id, name, flag_emoji')
        setCountries(cData || [])

        const { data: wData } = await supabase
          .from('wars')
          .select('id, attacker_id, defender_id, status')
          .eq('status', 'active')
        setActiveWars(wData || [])
      } catch (err) {
        console.error('Erro ao buscar dados auxiliares:', err)
      }
    }

    fetchAuxData()
  }, [data?.id])

  // ─── ESTADOS DE CARREGAMENTO ─────────────────────────────
  if (loadingC || loadingP) return <PageLoading />

  if (!data || !economy) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <p className="text-white/60 text-sm">Dados do país ainda não disponíveis.</p>
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
  const is_balanced = parliament
    ? parliament.coalition_seats === parliament.total_seats / 2
    : false

  let parlamentoStatus = '📊 Parlamento Equilibrado'
  if (has_majority) parlamentoStatus = '🟢 Parlamento Majoritário (Coalizão)'
  else if (!is_balanced && parliament) parlamentoStatus = '🔴 Parlamento Minoritário (Oposição)'

  // ─── LEIS ──────────────────────────────────────────────
  const selectedLaw = catalog.find(l => l.id === selectedLawId)
  const pendingLaws = laws.filter(l => l.status === 'pending')
  const activeLaws = laws.filter(l => l.status === 'active')
  const rejectedLaws = laws.filter(l => l.status === 'revoked').slice(0, 5)

  // ─── FUNÇÕES ──────────────────────────────────────────
  async function handlePropose() {
    if (!selectedLawId) return
    setProposing(true)
    setLawMsg('')

    const target = {
      countryId: targetCountryId || undefined,
      regionId: targetRegionId || undefined,
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
      setTargetText('')
      setTaxType('')
      setTaxValue(0)
    }

    setProposing(false)
  }

  async function handleForce(lawId: string) {
    setForcing(lawId)
    setForceMsg('')
    const res = await forceLaw(lawId)
    setForceMsg(res.message ?? res.error ?? 'Erro')
    setForcing(null)
  }

  // ─── RENDER ──────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 pb-8 w-full max-w-4xl mx-auto overflow-x-hidden">
     
      {/* ─── BANNER ─────────────────────────────────────── */}
      <div
        ref={bannerContainerRef}
        onClick={handleBannerClick}
        className={`relative h-48 w-full overflow-hidden rounded-xl mx-4 bg-black/40 border border-white/10 ${hasBanner && bannerImages.length > 1 ? 'cursor-pointer' : ''}`}
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
                    onClick={(e) => { e.stopPropagation(); goToSlide(idx) }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === bannerIndex ? 'bg-primary w-4' : 'bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
            Nenhuma foto no banner
          </div>
        )}
      </div>
 
      {/* ─── CABEÇALHO ──────────────────────────────────── */}
      <div className="px-4 -mt-6 relative z-10">
        <div className="flex items-end gap-4">
          <div className="w-20 h-16 rounded-lg border-2 border-primary shadow-lg shadow-primary/20 overflow-hidden flex-shrink-0 bg-black/80">
            {profile?.flag_url ? (
              <img src={profile.flag_url} alt={data.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-white/30">
                <Flag size={36} />
              </div>
            )}
          </div>
          <div className="flex-1 pb-1">
            <h2 className="text-2xl font-bold text-white">{data.name}</h2>
            <p className="text-white/50 text-sm">Capital: {data.capital}</p>
            {data.motto && (
              <p className="text-white/30 text-xs italic mt-0.5">"{data.motto}"</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── INFORMAÇÕES DO PAÍS ────────────────────────── */}
      <Section title={<span className="flex items-center gap-2"><Landmark size={16} /> INFORMAÇÕES</span>}>
        <InfoRow label="Título" value={`${data.leader_title}${data.leader_name ? ': ' + data.leader_name : ''}`} />
        <InfoRow label="Estrutura" value={data.state_structure || 'Democracia'} />
        <InfoRow label="Religião"  value={data.religion || 'Sem religião oficial'} />
        <InfoRow label="Moeda"     value={data.currency || 'NF ($)'} />
        <InfoRow label="Terreno"   value={data.terrain ? data.terrain.charAt(0).toUpperCase() + data.terrain.slice(1) : 'Planície'} />
      </Section>

      {/* ─── REGIÕES ────────────────────────────────────── */}
      <div className="px-4">
        <div className="bg-surface-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white/40 text-xs font-bold tracking-widest uppercase">
              <Map size={16} /> REGIÕES ({regions.length})
            </div>
          </div>

          {regions.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">Nenhuma região cadastrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs border-b border-white/5">
                    <th className="text-left py-2 font-medium">Região</th>
                    <th className="text-right py-2 font-medium">Km² usados</th>
                    <th className="text-right py-2 font-medium">Edifícios</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((region: any) => (
                    <tr key={region.id} className="border-b border-white/5 last:border-0">
                      <td className="py-2 text-white font-medium">{region.name}</td>
                      <td className="py-2 text-white/70 text-right">{region.used_area || 0}</td>
                      <td className="py-2 text-white/70 text-right">{buildingsCount[region.id] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── STATUS POLÍTICO ────────────────────────────── */}
      <Section title={<span className="flex items-center gap-2"><Shield size={16} /> STATUS POLÍTICO</span>}>
        <div className="flex flex-col gap-2">
          <TrustBar trust={data.trust || 50} label="Confiança" color="bg-green-500" />
          <TrustBar trust={data.intl_approval || 50} label="Aprovação" color="bg-blue-400" />
          <TrustBar trust={data.political_power ?? 0} label="Poder Pol." color="bg-purple-400" />
          {!loadingXP && combatXP && (
            <TrustBar
              trust={Math.min(100, (combatXP.experience / 10))}
              label="XP de Combate"
              color="bg-orange-500"
            />
          )}
          {!loadingXP && !combatXP && (
            <div className="text-white/30 text-xs text-center">Sem XP de combate</div>
          )}
        </div>
      </Section>

      {/* ─── PARLAMENTO VISUAL ──────────────────────────── */}
      <Section title={<span className="flex items-center gap-2"><Users size={16} /> PARLAMENTO</span>}>
        {parliament ? (
          <>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  {/* Círculo de fundo */}
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#222" strokeWidth="12" />
                  
                  {/* CORREÇÃO AQUI: Cálculo da circunferência para o gráfico */}
                  {(() => {
                    const radius = 54;
                    const circumference = 2 * Math.PI * radius; // ≈ 339.292
                    const coalitionLength = (coalition_pct / 100) * circumference;
                    const oppositionLength = circumference - coalitionLength;
                    
                    return (
                      <>
                        {/* Coalizão (verde) */}
                        <circle
                          cx="60" cy="60" r={radius}
                          fill="none"
                          stroke="#22C55E"
                          strokeWidth="12"
                          strokeDasharray={`${coalitionLength} ${circumference}`}
                          strokeLinecap="butt"
                        />
                        {/* Oposição (vermelho) */}
                        {coalition_pct < 100 && (
                          <circle
                            cx="60" cy="60" r={radius}
                            fill="none"
                            stroke="#EF4444"
                            strokeWidth="12"
                            strokeDasharray={`${oppositionLength} ${circumference}`}
                            strokeDashoffset={-coalitionLength}
                            strokeLinecap="butt"
                          />
                        )}
                      </>
                    );
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <span className="text-2xl font-bold">{parliament.total_seats}</span>
                  <span className="text-[10px] text-white/50">assentos</span>
                </div>
              </div>

              <div className="flex-1 w-full">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-white/60 text-xs">Coalizão</span>
                  </div>
                  <span className="text-green-400 font-bold text-sm">
                    {parliament.coalition_seats} ({coalition_pct}%)
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-white/60 text-xs">Oposição</span>
                  </div>
                  <span className="text-red-400 font-bold text-sm">
                    {parliament.opposition_seats} ({100 - coalition_pct}%)
                  </span>
                </div>

                <div className="mt-3 text-center">
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    has_majority ? 'bg-green-500/20 text-green-400' :
                    is_balanced ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {parlamentoStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="card-sm text-center">
                    <p className="text-white/40 text-[10px]">Próxima Eleição (Confiança)</p>
                    <p className="text-white font-bold text-sm">{nextElectionIn()}</p>
                  </div>
                  <div className="card-sm text-center">
                    <p className="text-white/40 text-[10px]">Eleição Aleatória</p>
                    <p className="text-white font-bold text-sm">{nextRandomIn()}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-white/40 text-sm text-center py-4">Dados do parlamento não disponíveis</p>
        )}
      </Section>

      {/* ─── PROPOR LEI ───────────────────────────────────── */}
      <Section title={<span className="flex items-center gap-2"><Gavel size={16} /> PROPOR LEI</span>}>
        <button
          onClick={() => setShowLawModal(true)}
          className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Gavel size={18} /> Propor Nova Lei
        </button>
        <p className="text-white/30 text-xs text-center mt-2">
          Confiança: <span className="text-green-400">{data.trust}%</span> ·
          Poder Político: <span className="text-purple-400">{data.political_power}</span>
        </p>
      </Section>

      {/* ─── LEIS PENDENTES ────────────────────────────── */}
      {pendingLaws.length > 0 && (
        <Section title={<span className="flex items-center gap-2"><Users size={16} /> EM VOTAÇÃO</span>}>
          {pendingLaws.map(law => (
            <div key={law.id} className="card-sm mb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white font-bold text-sm">{law.law_catalog?.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-green-400 text-xs">👍 {law.votes_for}</span>
                    <span className="text-red-400 text-xs">👎 {law.votes_against}</span>
                  </div>
                </div>
                <span className={`badge ${getCountdown(law.id) === 'Votação encerrada' ? 'badge-red' : 'badge-yellow'}`}>
                  ⏱️ {getCountdown(law.id)}
                </span>
              </div>
              <div className="progress-track mt-2">
                <div className="progress-fill" style={{ width: `${coalition_pct}%`, background: has_majority ? '#22C55E' : '#EF4444' }} />
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* ─── LEIS REJEITADAS ────────────────────────────── */}
      {rejectedLaws.length > 0 && (
        <Section title={<span className="flex items-center gap-2"><Gavel size={16} /> LEIS REJEITADAS</span>}>
          <p className="text-white/40 text-xs mb-2">
            Você pode forçar a aprovação gastando o poder político equivalente ao custo da lei.
          </p>
          {forceMsg && (
            <p className={`text-xs text-center mb-2 ${forceMsg.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
              {forceMsg}
            </p>
          )}
          {rejectedLaws.map(law => {
            const cost = catalog.find(c => c.id === law.law_catalog_id)?.political_power_cost || 50
            return (
              <div key={law.id} className="card-sm mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-white font-bold text-sm">{law.law_catalog?.name}</p>
                  <p className="text-white/40 text-xs">{law.votes_for} a favor · {law.votes_against} contra</p>
                </div>
                <button
                  onClick={() => handleForce(law.id)}
                  disabled={forcing === law.id || data.political_power < cost}
                  className="bg-purple-900 hover:bg-purple-800 disabled:opacity-30 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                >
                  {forcing === law.id ? '...' : `⚡ Forçar (${cost})`}
                </button>
              </div>
            )
          })}
        </Section>
      )}

      {/* ─── LEIS ATIVAS ────────────────────────────────── */}
      {activeLaws.length > 0 && (
        <Section title={<span className="flex items-center gap-2"><Landmark size={16} /> LEIS ATIVAS</span>}>
          {activeLaws.map(law => (
            <div key={law.id} className="card-sm mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-white font-bold text-sm">{law.law_catalog?.name}</p>
                <p className="text-white/40 text-xs">
                  {law.forced_approval ? '⚡ Aprovada por força política' : '✅ Aprovada pelo parlamento'}
                </p>
              </div>
              <span className="badge badge-green">Ativa</span>
            </div>
          ))}
        </Section>
      )}

      {/* ─── ECONOMIA ────────────────────────────────────── */}
      <Section title={<span className="flex items-center gap-2"><Coins size={16} /> ESTATÍSTICAS ECONÔMICAS</span>}>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Dinheiro"   value={formatMoney(Number(economy.money || 0))} icon={<Coins size={20} />} />
          <StatCard label="Inflação"   value={`${(Number(economy.inflation || 0) * 100).toFixed(1)}%`} icon={<TrendingUp size={20} />} />
          <StatCard label="Exportação" value={formatMoney(Number(economy.exports || 0))} icon={<TrendingUp size={20} />} />
          <StatCard label="Importação" value={formatMoney(Number(economy.imports || 0))} icon={<TrendingDown size={20} />} />
          <StatCard label="Receitas"   value={formatMoney(Number(economy.revenue || 0))} icon={<TrendingUp size={20} />} />
          <StatCard label="Despesas"   value={formatMoney(Number(economy.expenses || 0))} icon={<TrendingDown size={20} />} />
          <StatCard label="População"  value={formatPopulation(Number(economy.population || 0))} icon={<Users size={20} />} />
          <StatCard label="Poluição"   value={`${Number(economy.pollution || 0).toFixed(0)}%`} icon={<Radiation size={20} />} />
        </div>
      </Section>

      {/* ─── MILITAR ────────────────────────────────────── */}
      <Section title={<span className="flex items-center gap-2"><Shield size={16} /> EQUIPAMENTOS MILITARES</span>}>
        {loadingMil ? (
          <div className="flex justify-center py-4"><div className="spinner w-5 h-5" /></div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: <IoPeople size={24} className="text-white/60" />, label: 'Soldados', key: 'soldiers' },
              { icon: <IoDisc size={24} className="text-white/60" />, label: 'Munição', key: 'ammunition' },
              { icon: <IoShield size={24} className="text-white/60" />, label: 'Tanques', key: 'tanks' },
              { icon: <IoAirplane size={24} className="text-white/60" />, label: 'Aeronaves', key: 'aircraft' },
              { icon: <IoCog size={24} className="text-white/60" />, label: 'Helicópteros', key: 'helicopters' },
              { icon: <IoBug size={24} className="text-white/60" />, label: 'Drones', key: 'drones' },
              { icon: <IoRocket size={24} className="text-white/60" />, label: 'Mísseis', key: 'missiles' },
              { icon: <IoNuclear size={24} className="text-white/60" />, label: 'Ogivas', key: 'warheads' },
              { icon: <IoFlame size={24} className="text-white/60" />, label: 'Artilharia', key: 'artillery' },
            ].map(({ icon, label, key }) => (
              <div key={key} className="bg-surface rounded-xl p-2.5 flex flex-col items-center gap-1">
                {icon}
                <span className="text-white font-bold text-sm">{formatNumber(Number(military?.[key] ?? 0))}</span>
                <span className="text-white/40 text-xs">{label}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ─── MODAL DE PROPOR LEI ─────────────────────────── */}
      {showLawModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Gavel size={18} /> Propor Lei
              </h3>
              <button
                onClick={() => {
                  setShowLawModal(false)
                  setSelectedLawId('')
                  setLawMsg('')
                }}
                className="text-white/40 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {/* Select da lei */}
            <select
              value={selectedLawId}
              onChange={e => {
                const val = Number(e.target.value)
                setSelectedLawId(val as any)
                setTargetCountryId(null)
                setTargetRegionId('')
                setTargetText('')
                setTaxType('')
                setTaxValue(0)
              }}
              className="input-field mb-3"
            >
              <option value="">Selecionar lei...</option>
              {catalog.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.political_power_cost} PP
                  {l.requires_parliament ? ' (🗳️)' : ' (⚡ Direta)'}
                </option>
              ))}
            </select>

            {/* ─── CAMPOS DINÂMICOS ───────────────────────── */}
            {selectedLaw && (
              <div className="bg-white/5 rounded-lg p-3 mb-3 space-y-2">
                <p className="text-white/40 text-xs">{selectedLaw.description}</p>

                {/* 12: Transferência de Região */}
                {selectedLaw.id === 12 && (
                  <>
                    <select
                      value={targetRegionId}
                      onChange={e => setTargetRegionId(e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="">Escolha a região...</option>
                      {regions.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <select
                      value={targetCountryId || ''}
                      onChange={e => setTargetCountryId(Number(e.target.value) || null)}
                      className="input-field text-sm"
                    >
                      <option value="">Escolha o país destino...</option>
                      {countries.filter(c => c.id !== data.id).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </>
                )}

                {/* 4: Transferir Capital */}
                {selectedLaw.id === 4 && (
                  <select
                    value={targetRegionId}
                    onChange={e => setTargetRegionId(e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">Escolha a nova capital...</option>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                )}

                {/* 8: Declarar Guerra */}
                {selectedLaw.id === 8 && (
                  <select
                    value={targetCountryId || ''}
                    onChange={e => setTargetCountryId(Number(e.target.value) || null)}
                    className="input-field text-sm"
                  >
                    <option value="">Escolha o país alvo...</option>
                    {countries.filter(c => c.id !== data.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}

                {/* 13: Alterar Regime */}
                {selectedLaw.id === 13 && (
                  <input
                    type="text"
                    value={targetText}
                    onChange={e => setTargetText(e.target.value)}
                    placeholder="Novo regime (ex: Monarquia Parlamentar)"
                    className="input-field text-sm"
                  />
                )}

                {/* 1: Propor Paz */}
                {selectedLaw.id === 1 && (
                  <select
                    value={targetCountryId || ''}
                    onChange={e => setTargetCountryId(Number(e.target.value) || null)}
                    className="input-field text-sm"
                  >
                    <option value="">Escolha o país para propor paz...</option>
                    {countries.filter(c => c.id !== data.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}

                {/* 11: Participar de Guerra */}
                {selectedLaw.id === 11 && (
                  <div className="space-y-2">
                    <select
                      value={targetCountryId || ''}
                      onChange={e => setTargetCountryId(Number(e.target.value) || null)}
                      className="input-field text-sm"
                    >
                      <option value="">Escolha a guerra...</option>
                      {activeWars.map(w => {
                        const attacker = countries.find(c => c.id === w.attacker_id)
                        const defender = countries.find(c => c.id === w.defender_id)
                        return (
                          <option key={w.id} value={w.id}>
                            {attacker?.name || '?'} vs {defender?.name || '?'}
                          </option>
                        )
                      })}
                    </select>
                    <select
                      value={targetText}
                      onChange={e => setTargetText(e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="">Lado</option>
                      <option value="attacker">Atacante</option>
                      <option value="defender">Defensor</option>
                    </select>
                  </div>
                )}

                {/* 10: Aplicar Sanções */}
                {selectedLaw.id === 10 && (
                  <select
                    value={targetCountryId || ''}
                    onChange={e => setTargetCountryId(Number(e.target.value) || null)}
                    className="input-field text-sm"
                  >
                    <option value="">Escolha o país alvo...</option>
                    {countries.filter(c => c.id !== data.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}

                {/* 2: Alterar Nome de Estado */}
                {selectedLaw.id === 2 && (
                  <input
                    type="text"
                    value={targetText}
                    onChange={e => setTargetText(e.target.value)}
                    placeholder="Novo nome do país"
                    className="input-field text-sm"
                  />
                )}

                {/* 3: Criar Região */}
                {selectedLaw.id === 3 && (
                  <input
                    type="text"
                    value={targetText}
                    onChange={e => setTargetText(e.target.value)}
                    placeholder="Nome da nova região"
                    className="input-field text-sm"
                  />
                )}

                {/* 17: Mudar Impostos */}
                {selectedLaw.id === 17 && (
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={taxType}
                      onChange={e => setTaxType(e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="">Tipo de taxa</option>
                      <option value="income_tax">Renda</option>
                      <option value="property_tax">Propriedade</option>
                      <option value="manufacturing_tax">Manufatura</option>
                    </select>
                    <input
                      type="number"
                      value={taxValue}
                      onChange={e => setTaxValue(Number(e.target.value))}
                      placeholder="% (máx 60)"
                      min="0"
                      max="60"
                      className="input-field text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {lawMsg && (
              <p className={`text-xs text-center mb-2 ${lawMsg.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
                {lawMsg}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handlePropose}
                disabled={!selectedLawId || proposing}
                className="flex-1 bg-primary hover:bg-primary-light disabled:opacity-30 text-white font-bold py-2.5 rounded-lg transition-colors"
              >
                {proposing ? 'Propondo...' : 'Propor Lei'}
              </button>
              <button
                onClick={() => {
                  setShowLawModal(false)
                  setSelectedLawId('')
                  setLawMsg('')
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-lg transition-colors"
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
    <div className="px-4 flex flex-col gap-3">
      <p className="text-xs font-bold tracking-widest text-white/40 uppercase flex items-center gap-2">
        {title}
      </p>
      <div className="bg-surface-card rounded-xl p-3">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
      <span className="text-white/40 text-sm">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-xl p-3 flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        {icon && <span className="text-white/40">{icon}</span>}
        <span className="text-white font-bold text-base">{value}</span>
      </div>
      <span className="text-white/40 text-xs">{label}</span>
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