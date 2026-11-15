'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useCountry } from '@/hooks/useCountry'
import { useWorldStats } from '@/hooks/useWorldStats'
import { useWar, War } from '@/hooks/useWar' // ✅ Importação adicionada
import { supabase } from '@/lib/supabase/client'
import CountryBanner from '@/components/home/CountryBanner'
import { WorldStatsCarousel } from '@/components/home/StatsCarousel'
import GlobalChat from '@/components/home/GlobalChat'
import TrustBar from '@/components/home/TrustBar'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Handshake, Ban, Swords, ArrowRight, MapPin } from 'lucide-react'

type CountryInfo = {
  id: number
  name: string
  flag_emoji: string
  slug: string | null
}

export default function HomePage() {
  const { user } = useAuthStore()
  const router = useRouter()
  
  const { data: country, economy, profile, loading: loadingCountry } = useCountry()
  const { stats, loading: loadingWorld } = useWorldStats()
  const { myWars, loading: loadingWars } = useWar() // ✅ Hook das guerras

  // ✅ Estados para a Diplomacia
  const [allies, setAllies] = useState<CountryInfo[]>([])
  const [sanctionsApplied, setSanctionsApplied] = useState<CountryInfo[]>([])
  const [sanctionsReceived, setSanctionsReceived] = useState<CountryInfo[]>([])
  const [loadingDiplomacy, setLoadingDiplomacy] = useState(true)

  useEffect(() => {
    if (!user) router.replace('/auth/login')
  }, [user, router])

  // ✅ Busca dados diplomáticos para a Home
  const fetchDiplomacy = useCallback(async () => {
    if (!country?.id) return
    const currentId = country.id

    try {
      const { data: diploData } = await supabase
        .from('diplomacy')
        .select(`
          country_a_id, 
          country_b_id, 
          status, 
          relation_score, 
          sanctions_active,
          country_a:countries!diplomacy_country_a_id_fkey(id, name, flag_emoji, slug),
          country_b:countries!diplomacy_country_b_id_fkey(id, name, flag_emoji, slug)
        `)
        .or(`country_a_id.eq.${currentId},country_b_id.eq.${currentId}`)

      if (diploData && diploData.length > 0) {
        const alliedList: CountryInfo[] = []
        const appliedSanctions: CountryInfo[] = []
        const receivedSanctions: CountryInfo[] = []

        diploData.forEach((rel: any) => {
          const isCountryA = Number(rel.country_a_id) === Number(currentId)
          const otherCountry = isCountryA ? rel.country_b : rel.country_a
          if (!otherCountry) return

          const status = (rel.status || '').toLowerCase()
          const isAlly = status === 'ally' || status === 'aliado' || status === 'alliance' || rel.relation_score >= 80
          
          if (isAlly) alliedList.push(otherCountry)

          if (rel.sanctions_active) {
            if (isCountryA) appliedSanctions.push(otherCountry)
            else receivedSanctions.push(otherCountry)
          }
        })

        setAllies(alliedList)
        setSanctionsApplied(appliedSanctions)
        setSanctionsReceived(receivedSanctions)
      }
    } catch (err) {
      console.error('Erro ao buscar diplomacia:', err)
    } finally {
      setLoadingDiplomacy(false)
    }
  }, [country?.id])

  useEffect(() => {
    fetchDiplomacy()
  }, [fetchDiplomacy])

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
    // ✅ pt-68 para manter o espaçamento do header
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-68 pb-10">

      {/* ── 1. Banner principal ── */}
      <CountryBanner country={country} profile={profile} />

      {/* ── 2. Bem-vindo ── */}
      <div className="flex items-center gap-3 px-1 animate-in fade-in slide-in-from-left-4 duration-500">
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

      {/* ── 3. Barra de Governabilidade ── */}
      <div className="bg-surface-card border border-surface-border rounded-lg p-4 shadow-lg flex flex-col gap-3">
        <TrustBar 
          trust={(country as any).governability ?? 50} 
          label="Governabilidade" 
          color="bg-green-500" 
        />
      </div>

      <Divider />

      {/* ── 4. Stats Mundiais ── */}
      {stats && !loadingWorld ? (
        <WorldStatsCarousel stats={stats} />
      ) : (
        <StatsSkeleton />
      )}

      <Divider />

      {/* ── 5. Painel Diplomático ── */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-2 pl-1">
          <div className="w-1 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0" />
          <p className="text-[10px] font-bold tracking-widest text-white uppercase font-mono">Situação Diplomática</p>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-lg p-4 shadow-lg grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Aliados */}
          <div className="flex flex-col">
            <p className="text-white/50 text-[10px] font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-white/10 pb-1">
              <Handshake size={12} className="text-green-400" /> Aliados
            </p>
            {loadingDiplomacy ? (
              <div className="h-10 animate-pulse bg-white/5 rounded" />
            ) : allies.length === 0 ? (
              <p className="text-white/30 text-[10px] font-mono italic mt-1">Nenhum aliado.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {allies.map((ally) => (
                  <Link
                    key={ally.id}
                    href={`/game/pais/${ally.slug || ally.id}`}
                    className="flex items-center gap-1.5 bg-surface-input border border-surface-border hover:border-green-500/50 hover:bg-green-500/10 rounded px-2 py-1 transition-colors group"
                  >
                    <span className="text-sm">{ally.flag_emoji || '🌐'}</span>
                    <span className="text-white/80 group-hover:text-green-400 text-[10px] font-bold uppercase truncate max-w-[80px]">
                      {ally.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sancionado Por */}
          <div className="flex flex-col">
            <p className="text-white/50 text-[10px] font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-white/10 pb-1">
              <ShieldAlert size={12} className="text-red-400" /> Sancionado Por
            </p>
            {loadingDiplomacy ? (
              <div className="h-10 animate-pulse bg-white/5 rounded" />
            ) : sanctionsReceived.length === 0 ? (
              <p className="text-white/30 text-[10px] font-mono italic mt-1">Nenhuma sanção.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {sanctionsReceived.map((c) => (
                  <Link
                    key={c.id}
                    href={`/game/pais/${c.slug || c.id}`}
                    className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/20 rounded px-2 py-1 transition-colors group"
                  >
                    <span className="text-sm">{c.flag_emoji || '🌐'}</span>
                    <span className="text-red-400 text-[10px] font-bold uppercase truncate max-w-[80px]">
                      {c.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Você Sancionou */}
          <div className="flex flex-col">
            <p className="text-white/50 text-[10px] font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-white/10 pb-1">
              <Ban size={12} className="text-yellow-400" /> Você Sancionou
            </p>
            {loadingDiplomacy ? (
              <div className="h-10 animate-pulse bg-white/5 rounded" />
            ) : sanctionsApplied.length === 0 ? (
              <p className="text-white/30 text-[10px] font-mono italic mt-1">Nenhuma sanção aplicada.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {sanctionsApplied.map((c) => (
                  <Link
                    key={c.id}
                    href={`/game/pais/${c.slug || c.id}`}
                    className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 hover:border-yellow-500/50 hover:bg-yellow-500/20 rounded px-2 py-1 transition-colors group"
                  >
                    <span className="text-sm">{c.flag_emoji || '🌐'}</span>
                    <span className="text-yellow-400 text-[10px] font-bold uppercase truncate max-w-[80px]">
                      {c.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      <Divider />

      {/* ── 6. Chat Global ── */}
      <GlobalChat />

      <Divider />

      {/* ── 7. Minhas Guerras Ativas (NOVO) ── */}
      <div className="flex flex-col mt-2">
        <div className="flex items-center justify-between mb-3 pl-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0" />
            <p className="text-[10px] font-bold tracking-widest text-white uppercase font-mono">Minhas Guerras Ativas</p>
          </div>
          
          <Link href="/game/war" className="text-[10px] font-bold text-primary hover:text-primary-light transition-colors flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
            Ver Todas <ArrowRight size={12} />
          </Link>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-lg p-4 shadow-lg">
          {loadingWars ? (
            <div className="h-20 animate-pulse bg-surface-input rounded-lg" />
          ) : myWars.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Swords size={32} className="text-white/10 mb-2" />
              <p className="text-white/40 text-xs font-mono uppercase tracking-widest">Em paz com todas as nações</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myWars.slice(0, 3).map((war: War) => {
                // Calculo rápido do progresso
                const attDmg = war.damage_to_defender || 0
                const defDmg = war.damage_to_attacker || 0
                const totalDmg = attDmg + defDmg
                const attPct = totalDmg === 0 ? 50 : Math.round((attDmg / totalDmg) * 100)
                const defPct = totalDmg === 0 ? 50 : 100 - attPct

                return (
                  <Link key={war.id} href="/game/war">
                    <div className="bg-surface-input border border-surface-border rounded-lg p-3 hover:border-primary/50 transition-colors flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-emerald-400" />
                          <span className="text-white font-bold text-xs uppercase tracking-wider">
                            {war.attacker_region?.name || 'Origem'} vs {war.defender_region?.name || 'Alvo'}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-white/40 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                          {war.terrain || 'Desconhecido'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 text-[10px] font-mono mt-1">
                        <div className="flex items-center gap-1.5 flex-1 justify-end">
                          <span className="text-red-400 font-bold">{attPct}%</span>
                          <span className="text-white/60">{war.attacker?.name}</span>
                        </div>
                        
                        <div className="w-1/3 h-1.5 bg-black/50 rounded-full overflow-hidden flex shrink-0">
                          <div style={{ width: `${attPct}%` }} className="h-full bg-red-500" />
                          <div style={{ width: `${defPct}%` }} className="h-full bg-blue-500" />
                        </div>

                        <div className="flex items-center gap-1.5 flex-1 justify-start">
                          <span className="text-white/60">{war.defender?.name}</span>
                          <span className="text-blue-400 font-bold">{defPct}%</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
              
              {myWars.length > 3 && (
                <Link href="/game/war" className="text-center text-[10px] text-white/40 hover:text-white font-mono uppercase mt-1 transition-colors">
                  + {myWars.length - 3} outras guerras...
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

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