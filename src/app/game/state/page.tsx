'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCountry } from '@/hooks/useCountry'
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
  ChevronDown,
  ChevronUp,
  Building2,
  Zap,
  BookOpen
} from 'lucide-react'

export default function StatePage() {
  const { country: myCountry } = useAuthStore()
  const { data, economy, profile, loading: loadingC, refetch: refetchCountry } = useCountry()

  const [expandedRegions, setExpandedRegions] = useState(false)

  useEffect(() => {
    refetchCountry()
  }, [refetchCountry])

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

  // ─── BANNER CARROSSEL ───────────────────────────────────
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
      }, 4000)
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

  const handleBannerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!bannerContainerRef.current || bannerImages.length <= 1) return
    const rect = bannerContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const center = rect.width / 2

    if (x < center) {
      setBannerIndex(prev => (prev - 1 + bannerImages.length) % bannerImages.length)
    } else {
      setBannerIndex(prev => (prev + 1) % bannerImages.length)
    }
    stopTimer()
    startTimer()
  }

  // ─── REGIÕES E ESTATÍSTICAS ──────────────────────────────
  const [regions, setRegions] = useState<any[]>([])
  const [buildingsCount, setBuildingsCount] = useState<Record<string, number>>({})

  useEffect(() => {
    async function fetchRegions() {
      if (!data?.id) return
      const currentCountryId = data.id

      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('*') 
        .eq('country_id', currentCountryId)

      if (regionsError) return

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
    fetchRegions()
  }, [data?.id])

  if (loadingC) return <PageLoading />

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

  const totalPop = Number(economy.population || 0)
  const regionPop = regions.length > 0 ? Math.round(totalPop / regions.length) : 0
  const totalInfra = Object.values(buildingsCount).reduce((a, b) => a + b, 0) * 10
  const avgInfra = regions.length > 0 ? (totalInfra / regions.length).toFixed(2) : '0.00'
  const isPowered = Number(economy.energy || 0) > 0

  return (
    // ✅ pt-24 para não esconder no header
    <div className="flex flex-col gap-6 pb-12 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-17">

      {/* ─── 1. BANNER IMERSIVO ───────────────────────────── */}
      <div
        ref={bannerContainerRef}
        onClick={handleBannerClick}
        className={`relative w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden shadow-2xl border border-surface-border group ${hasBanner && bannerImages.length > 1 ? 'cursor-pointer' : ''}`}
      >
        {hasBanner ? (
          <>
            <img
              src={bannerImages[bannerIndex]}
              alt="Banner do país"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            {/* Gradiente para escurecer a base */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f18] via-[#0a0f18]/40 to-transparent" />
            
            {/* Conteúdo Sobreposto (Bandeira + Nome + Capital) */}
            <div className="absolute bottom-0 w-full p-6 md:p-8 flex items-end gap-4 md:gap-6 z-10">
              {/* Bandeira */}
              <div className="w-24 h-16 md:w-36 md:h-24 rounded-sm border-2 border-white/20 shadow-2xl overflow-hidden shrink-0 bg-black/50">
                {profile?.flag_url ? (
                  <img src={profile.flag_url} alt={data.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Flag size={32} className="text-white/30" /></div>
                )}
              </div>
              
              {/* Textos */}
              <div className="flex flex-col mb-1">
                <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-wider leading-none drop-shadow-xl">
                  {data.name}
                </h1>
                <p className="text-blue-400 font-bold text-xs md:text-sm tracking-widest uppercase mt-2 drop-shadow-md">
                  Capital: {data.capital}
                </p>
              </div>
            </div>

            {/* Bolinhas do Carrossel */}
            {bannerImages.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {bannerImages.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={e => { e.stopPropagation(); goToSlide(idx) }}
                    className={`h-2 rounded-full transition-all ${idx === bannerIndex ? 'bg-primary w-4' : 'bg-white/30 hover:bg-white/50 w-2'}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-card text-white/20">
            <Flag size={64} className="mb-2 opacity-50" />
            <span className="text-xs font-mono tracking-widest uppercase">Nenhuma foto no banner</span>
          </div>
        )}
      </div>

      {/* ─── 2. DESCRIÇÃO DA NAÇÃO ──────────────────────── */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 shadow-lg relative group">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={18} className="text-primary" />
          <h2 className="text-xs font-bold text-white uppercase tracking-widest">Sobre a Nação</h2>
        </div>
        <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-mono">
          {/* ✅ CORREÇÃO AQUI: Trocado description por biography */}
          {(data as any).biography || 'Nenhuma biografia foi escrita. Vá em Configurações para contar a história e as tradições do seu país ao mundo.'}
        </p>
        {!((data as any).biography) && (
          <Link href="/game/configuracoes" className="mt-4 inline-flex items-center gap-1 text-primary text-[10px] font-bold uppercase tracking-wider hover:text-primary-light transition-colors">
            Escrever Biografia <ChevronDown size={12} className="-rotate-90" />
          </Link>
        )}
      </div>

      {/* ─── 3. STATUS POLÍTICO ─────────────────────────── */}
      <Section
        title={
          <span className="flex items-center gap-2">
            <Shield size={16} /> STATUS POLÍTICO E MILITAR
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          <TrustBar trust={(data as any).governability ?? 50} label="Governabilidade" color="bg-green-500" />
          {!loadingXP && combatXP && (
            <TrustBar
              trust={Math.min(100, combatXP.experience / 10)}
              label="XP de Combate"
              color="bg-orange-500"
            />
          )}
        </div>
      </Section>

      {/* ─── 4. ESTATÍSTICAS ────────────────────────────── */}
      <Section
        title={
          <span className="flex items-center gap-2">
            <Coins size={16} /> ESTATÍSTICAS DO PAÍS
          </span>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Dinheiro" value={formatMoney(Number(economy.money || 0))} icon={<Coins size={18} />} />
          <StatCard label="Receitas" value={formatMoney(Number(economy.revenue || 0))} icon={<TrendingUp size={18} />} />
          <StatCard label="Despesas" value={formatMoney(Number(economy.expenses || 0))} icon={<TrendingDown size={18} />} />
          
          <StatCard label="Exportação" value={formatMoney(Number(economy.exports || 0))} icon={<TrendingUp size={18} />} />
          <StatCard label="Importação" value={formatMoney(Number(economy.imports || 0))} icon={<TrendingDown size={18} />} />
          <StatCard label="População" value={formatPopulation(totalPop)} icon={<Users size={18} />} />
          
          <StatCard label="IDH" value={Number((economy as any).idh || 0).toFixed(3)} icon={<TrendingUp size={18} className="text-blue-400" />} />
          <StatCard label="Cresc. Pop." value={`+${Number((economy as any).population_growth || 0).toFixed(1)}%`} icon={<Users size={18} className="text-green-400" />} />
          <StatCard label="Inflação" value={`${Number((economy as any).inflation || 0).toFixed(1)}%`} icon={<TrendingDown size={18} className="text-yellow-400" />} />
          
          <StatCard label="Poluição" value={`${Number(economy.pollution || 0).toFixed(0)}%`} icon={<Zap size={18} className="text-red-400" />} />
        </div>
      </Section>

      {/* ─── 5. TABELA DOMÉSTICA ────────────────────────── */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden shadow-lg mt-2">
        <div className="bg-primary/20 border-b border-primary/30 py-2 px-4 flex items-center gap-2">
          <Landmark size={16} className="text-primary-light" />
          <h2 className="text-sm font-bold text-primary-light uppercase tracking-widest">Doméstico</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-surface-border">
          
          <div className="flex flex-col">
            <DomesticRow label="Moeda" value={data.currency || 'Dólar'} icon="💵" />
            <DomesticRow label="Tipo de Governo" value={data.systems || 'Democracia'} icon={data.systems === 'Autoritario' ? '👑' : '⚖️'} />
            <DomesticRow label="Estrutura" value={data.state_structure || 'República'} icon="🏛️" />
          </div>

          <div className="flex flex-col">
            <DomesticRow label="Religião do Estado" value={data.religion || 'Nenhuma'} icon="🕊️" />
            <DomesticRow label="Políticas Sociais" value="Liberal" icon="📖" />
            <DomesticRow label="Animal Nacional" value="Ovelha" icon="🐑" />
          </div>
        </div>
      </div>

      {/* ─── 6. CIDADES / REGIÕES ───────────────────────── */}
      <Section
        title={
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-2">
              <Building2 size={16} /> CIDADES / REGIÕES ({regions.length})
            </span>
            <button
              onClick={() => setExpandedRegions(!expandedRegions)}
              className="text-white/40 hover:text-white transition-colors"
            >
              {expandedRegions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        }
      >
        {regions.length === 0 ? (
          <p className="text-white/30 text-xs font-mono text-center py-4 uppercase">NENHUMA REGIÃO CADASTRADA</p>
        ) : (
          <div className="flex flex-col gap-4">
            {regions.slice(0, expandedRegions ? undefined : 3).map((region: any) => (
              <Link key={region.id} href={`/game/regiao/${region.id}`}>
                <div className="group flex flex-col sm:flex-row border border-surface-border rounded-lg overflow-hidden bg-surface-input hover:border-primary/50 transition-colors">
                  
                  {/* Dados */}
                  <div className="p-4 sm:w-1/3 shrink-0 flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-surface-border bg-black/20">
                    <h3 className="text-primary-light font-bold text-lg mb-2 group-hover:text-primary transition-colors">{region.name}</h3>
                    <div className="text-xs font-mono text-white/60 space-y-1">
                      <p>Pop: <span className="text-white">{formatNumber(regionPop)}</span></p>
                      <p>Infra: <span className="text-white">{avgInfra}</span></p>
                      <p className="flex items-center gap-1">Energia: <span className={isPowered ? "text-green-400" : "text-red-400"}>{isPowered ? 'Sim' : 'Não'}</span></p>
                    </div>
                  </div>

                  {/* Imagem */}
                  <div className="w-full sm:w-2/3 h-32 sm:h-auto overflow-hidden bg-black/50 relative">
                    {region.image_url ? (
                      <img src={region.image_url} alt={region.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                        <Map size={32} className="mb-1" />
                        <span className="text-[10px] uppercase font-mono tracking-widest">Sem imagem</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {!expandedRegions && regions.length > 3 && (
              <button onClick={() => setExpandedRegions(true)} className="text-primary text-xs font-bold uppercase tracking-widest py-2 hover:text-primary-light transition-colors flex items-center justify-center gap-1">
                Ver todas as {regions.length} cidades <ChevronDown size={14} />
              </button>
            )}
          </div>
        )}
      </Section>

    </div>
  )
}

// ─── COMPONENTES AUXILIARES ──────────────────────────────
function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-2 pl-1 w-full mt-2">
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

function DomesticRow({ label, value, icon }: { label: string, value: string, icon?: string }) {
  return (
    <div className="flex justify-between items-center p-3 border-b border-surface-border last:border-b-0 md:border-b">
      <span className="text-white/60 text-xs font-mono tracking-wider">{label}:</span>
      <span className="text-white font-bold text-sm flex items-center gap-2">
        {value} {icon && <span className="text-lg">{icon}</span>}
      </span>
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