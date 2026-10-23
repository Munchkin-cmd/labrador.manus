'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCountry } from '@/hooks/useCountry'
import { useWorldStats } from '@/hooks/useWorldStats'
import { supabase } from '@/lib/supabase/client'
import CountryBanner from '@/components/home/CountryBanner'
import { WorldStatsCarousel, CountryStatsCarousel } from '@/components/home/StatsCarousel'
import GlobalChat from '@/components/home/GlobalChat'
import TrustBar from '@/components/home/TrustBar'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { user } = useAuthStore()
  const router = useRouter()
  
  const { data: country, economy, profile, loading: loadingCountry } = useCountry()
  const { stats, loading: loadingWorld } = useWorldStats()

  // ✅ Estado para guardar a contagem exata de regiões
  const [regionsCount, setRegionsCount] = useState(0)

  useEffect(() => {
    if (!user) router.replace('/auth/login')
  }, [user, router])

  // ✅ Busca a contagem exata de regiões no banco
  useEffect(() => {
    if (!country?.id) return

    const currentId = country.id

    async function fetchRegionsCount() {
      const { count, error } = await supabase
        .from('regions')
        .select('*', { count: 'exact', head: true })
        .eq('country_id', currentId)

      if (!error && count !== null) {
        setRegionsCount(count)
      }
    }

    fetchRegionsCount()
  }, [country?.id])

  if (loadingCountry) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-xs font-mono tracking-widest uppercase">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!country || !economy || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center min-h-[60vh]">
        <div>
          <p className="text-white/60 text-xs font-mono uppercase tracking-widest mb-4">Não foi possível carregar os dados do país.</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm py-2 px-6 w-auto mx-auto block">
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    // ✅ ALTERAÇÃO AQUI: Mudei o "pt-6" para "pt-10" para empurrar o banner e criar o vão abaixo do header
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-24">

      {/* ── Banner principal ── */}
      <CountryBanner country={country} profile={profile} />

      {/* ── Barras de status ── */}
      <div className="bg-surface-card border border-surface-border rounded-lg p-4 shadow-lg flex flex-col gap-3">
        <TrustBar trust={country.trust} label="Confiança" color="bg-green-500" />
        <TrustBar trust={country.intl_approval} label="Aprovação" color="bg-blue-400" />
        <TrustBar trust={country.political_power} label="Poder Pol." color="bg-purple-400" />
      </div>

      {/* ── Separador ── */}
      <Divider />

      {/* ✅ NOVO: Saudação de Bem-Vindo */}
      <div className="flex items-center gap-3 px-1 mt-2 mb-2 animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="w-1.5 h-10 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            Bem-vindo, <span className="text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]">{country.name}</span> 👋
          </h1>
          <p className="text-[10px] text-white/40 font-mono tracking-widest uppercase mt-0.5">
            Painel de Controle • Visão Geral
          </p>
        </div>
      </div>

      {/* ── Stats mundiais ── */}
      {stats && !loadingWorld ? (
        <WorldStatsCarousel stats={stats} />
      ) : (
        <StatsSkeleton />
      )}

      {/* ── Separador ── */}
      <Divider />

      {/* ── Stats do país (Passando o regionsCount) ── */}
      <CountryStatsCarousel country={country} economy={economy} regionsCount={regionsCount} />

      {/* ── Separador ── */}
      <Divider />

      {/* ── Chat Global ── */}
      <GlobalChat />

    </div>
  )
}

function Divider() {
  return <div className="h-px bg-surface-border mx-2" />
}

function StatsSkeleton() {
  return (
    <div className="px-1">
      <div className="h-3 w-32 bg-surface-input border border-surface-border rounded mb-3 animate-pulse" />
      <div className="bg-surface-card border border-surface-border rounded-lg p-4 grid grid-cols-3 gap-2 shadow-lg">
        {[1,2,3].map(i => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-5 w-12 bg-surface-input rounded animate-pulse" />
            <div className="h-2 w-8 bg-surface-border rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}