'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useCountry } from '@/hooks/useCountry'
import { useAuthStore } from '@/store/authStore'
import TrustBar from '@/components/home/TrustBar'
import { formatNumber } from '@/utils/format'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'

const TERRAIN_INFO: Record<string, { label: string; emoji: string; resources: string }> = {
  planicie:   { label: 'Planície',  emoji: '🌾', resources: 'Madeira, Petróleo, Carvão' },
  orogenico:  { label: 'Orogênico', emoji: '⛰️', resources: 'Ouro, Ferro, Urânio' },
  extremista: { label: 'Extremista',emoji: '🏜️', resources: 'Petróleo, Urânio' },
  anfibio:    { label: 'Anfíbio',   emoji: '🌊', resources: 'Madeira, Ouro, Petróleo' },
}

type MilitaryRow = Database['public']['Tables']['military']['Row']
type MilitaryLossesRow = Database['public']['Tables']['military_losses']['Row']
type CountryRow = Database['public']['Tables']['countries']['Row']

type AllyInfo = {
  id: number
  name: string
  flag_emoji: string
  slug: string | null
}

export default function PassaportePage() {
  const { country } = useAuthStore()
  const { data: initialData, economy, profile, loading } = useCountry()
  
  const [liveData, setLiveData] = useState<CountryRow | null>(null)
  const [regionsCount, setRegionsCount] = useState(0)
  const [military, setMilitary] = useState<Partial<MilitaryRow> | null>(null)
  const [losses, setLosses] = useState<Partial<MilitaryLossesRow> | null>(null)
  const [destroyedBuildings, setDestroyedBuildings] = useState(0)
  const [warStats, setWarStats] = useState({ wins: 0, losses: 0 })
  const [allies, setAllies] = useState<AllyInfo[]>([])

  const fetchExtras = useCallback(async () => {
    if (!country?.id) return
    const currentId = country.id

    // 1. Dados do país atualizados
    const { data: cData } = await supabase.from('countries').select('*').eq('id', currentId).single()
    if (cData) setLiveData(cData)

    // 2. Contagem de regiões
    const { count: rCount } = await supabase.from('regions').select('*', { count: 'exact', head: true }).eq('country_id', currentId)
    setRegionsCount(rCount || 0)

    // 3. Dados militares
    const { data: mil } = await supabase.from('military').select('*').eq('country_id', currentId).maybeSingle()
    setMilitary(mil || null)

    // 4. Perdas
    const { data: lossesData } = await supabase.from('military_losses').select('*').eq('country_id', currentId)
    if (lossesData && lossesData.length > 0) {
      const totals = lossesData.reduce((acc, curr) => ({
        soldiers_lost: (acc.soldiers_lost || 0) + (curr.soldiers_lost || 0),
        tanks_lost: (acc.tanks_lost || 0) + (curr.tanks_lost || 0),
        aircraft_lost: (acc.aircraft_lost || 0) + (curr.aircraft_lost || 0),
        helicopters_lost: (acc.helicopters_lost || 0) + (curr.helicopters_lost || 0),
        drones_lost: (acc.drones_lost || 0) + (curr.drones_lost || 0),
        missiles_lost: (acc.missiles_lost || 0) + (curr.missiles_lost || 0),
        warheads_lost: (acc.warheads_lost || 0) + (curr.warheads_lost || 0),
        artillery_lost: (acc.artillery_lost || 0) + (curr.artillery_lost || 0),
      }), {} as Partial<MilitaryLossesRow>)
      setLosses(totals)
    } else {
      setLosses(null)
    }

    // 5. Edifícios destruídos
    const { count: destroyed } = await supabase.from('destroyed_buildings').select('*', { count: 'exact', head: true }).eq('country_id', currentId)
    setDestroyedBuildings(destroyed || 0)

    // 6. Estatísticas de guerras
    const { data: wars } = await supabase
      .from('wars')
      .select('attacker_id, defender_id, winner_id, status')
      .or(`attacker_id.eq.${currentId},defender_id.eq.${currentId}`)
      .in('status', ['ended', 'peace']) as any

    let wins = 0, lossesCount = 0
    wars?.forEach((w: any) => {
      if (w.status === 'peace' || !w.winner_id) return
      
      if (Number(w.winner_id) === Number(currentId)) {
        wins++
      } else {
        lossesCount++
      }
    })
    setWarStats({ wins, losses: lossesCount })

    // 7. Aliados (✅ CORRIGIDO: Filtro flexível e conversão de Number)
    const { data: alliesRel } = await supabase
      .from('diplomacy')
      .select('country_a_id, country_b_id, status, relation_score')
      .or(`country_a_id.eq.${currentId},country_b_id.eq.${currentId}`)

    if (alliesRel && alliesRel.length > 0) {
      // Filtra para aceitar qualquer variação de "aliado" ou relação maior que 80
      const alliedRelations = alliesRel.filter(rel => {
        const status = (rel.status || '').toLowerCase()
        return status === 'ally' || status === 'aliado' || status === 'alliance' || rel.relation_score >= 80
      })

      if (alliedRelations.length > 0) {
        const allyIds = alliedRelations
          .map(rel => Number(rel.country_a_id) === Number(currentId) ? rel.country_b_id : rel.country_a_id)
          .filter(id => id !== Number(currentId)) // Garante que não vai incluir o próprio país

        if (allyIds.length > 0) {
          const { data: allyCountries } = await supabase.from('countries').select('id, name, flag_emoji, slug').in('id', allyIds)
          setAllies(allyCountries || [])
        } else {
          setAllies([])
        }
      } else {
        setAllies([])
      }
    } else {
      setAllies([])
    }
  }, [country?.id])

  useEffect(() => {
    if (!country?.id) return
    fetchExtras()
    const onFocus = () => fetchExtras()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [country?.id, fetchExtras])

  if (loading) return <Loading />
  if (!initialData || !economy) return null

  const data = liveData || initialData
  const terrain = TERRAIN_INFO[data.terrain] ?? { label: data.terrain, emoji: '🗺️', resources: '—' }

  const equipmentList = [
    { key: 'soldiers', label: 'Soldados', emoji: '⚔️', lossKey: 'soldiers_lost' },
    { key: 'tanks', label: 'Tanques', emoji: '🛡️', lossKey: 'tanks_lost' },
    { key: 'artillery', label: 'Artilharia', emoji: '💣', lossKey: 'artillery_lost' },
    { key: 'aircraft', label: 'Aeronaves', emoji: '✈️', lossKey: 'aircraft_lost' },
    { key: 'helicopters', label: 'Helicópteros', emoji: '🚁', lossKey: 'helicopters_lost' },
    { key: 'drones', label: 'Drones', emoji: '🤖', lossKey: 'drones_lost' },
    { key: 'missiles', label: 'Mísseis', emoji: '🎯', lossKey: 'missiles_lost' },
    { key: 'warheads', label: 'Ogivas', emoji: '☢️', lossKey: 'warheads_lost' },
  ]

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-24">
      
      {/* Capa */}
      <div className="relative h-56 bg-surface-card border border-surface-border rounded-xl overflow-hidden shadow-2xl">
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
            <span className="text-5xl drop-shadow-lg">{data.flag_emoji}</span>
          )}
          <h2 className="text-white font-black text-2xl text-center uppercase tracking-widest drop-shadow-md">
            {data.name}
          </h2>
          <p className="text-primary/80 text-[11px] font-mono font-bold uppercase tracking-widest">
            CAPITAL: {data.capital}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Section title="IDENTIDADE">
          <Row label="País"            value={data.name} />
          <Row label="Capital"         value={data.capital} />
          <Row label="Líder"           value={`${data.leader_title}${data.leader_name ? ': ' + data.leader_name : ''}`} />
          <Row label="Estrutura"       value={data.state_structure} />
          <Row label="Religião"        value={data.religion} />
          <Row label="Moeda"           value={data.currency} />
          <Row label="Idioma"          value={data.language} />
          {data.motto && <Row label="Lema" value={`"${data.motto}"`} />}
        </Section>

        <Section title="TERRITÓRIO">
          <Row label="Terreno"         value={`${terrain.emoji} ${terrain.label}`} />
          <Row label="Recursos Nat."   value={terrain.resources} />
          <Row label="Regiões"         value={`${regionsCount}`} />
        </Section>

        <Section title="STATUS">
          <div className="flex flex-col gap-4 pt-1 pb-1">
            <TrustBar trust={data.trust}           label="Confiança"   color="bg-green-500" />
            <TrustBar trust={data.intl_approval}   label="Aprovação"   color="bg-blue-400" />
            <TrustBar trust={data.political_power} label="Poder Pol."  color="bg-purple-400" />
          </div>
        </Section>

        <Section title="ESTATÍSTICAS NACIONAIS">
          <div className="bg-surface-input border border-surface-border rounded-lg p-3">
            <Row label="Infraestrutura destruída" value={`${destroyedBuildings} edifícios`} />
            <Row label="Guerras vencidas" value={`${warStats.wins}`} />
            <Row label="Guerras perdidas" value={`${warStats.losses}`} />
          </div>
        </Section>

        <Section title="MILITARES">
          <div className="flex flex-col gap-3">
            {equipmentList.map(item => {
              const stock = (military?.[item.key as keyof MilitaryRow] as number) || 0
              const lost = (losses?.[item.lossKey as keyof MilitaryLossesRow] as number) || 0
              return (
                <div key={item.key} className="bg-surface-input border border-surface-border rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl drop-shadow-md">{item.emoji}</span>
                    <div>
                      <p className="text-white font-bold text-xs uppercase tracking-wider">{item.label}</p>
                      <p className="text-white/40 text-[10px] font-mono mt-0.5">ESTOQUE: {formatNumber(stock)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 text-[11px] font-bold font-mono">BAIXAS: {formatNumber(lost)}</p>
                    <p className="text-white/30 text-[9px] font-mono uppercase tracking-widest mt-0.5">Destruídos</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="🤝 ALIADOS">
          {allies.length === 0 ? (
            <p className="text-white/40 text-[10px] font-mono text-center py-4 uppercase tracking-widest">Nenhum aliado ativo</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allies.map((ally) => (
                <Link
                  key={ally.id}
                  href={`/game/pais/${ally.slug || ally.id}`}
                  className="flex items-center gap-2 bg-surface-input border border-surface-border hover:border-primary/50 hover:bg-white/5 rounded-lg px-3 py-2 transition-colors group"
                >
                  <span className="text-xl">{ally.flag_emoji || '🌐'}</span>
                  <span className="text-white text-[11px] font-bold uppercase tracking-wider group-hover:text-primary transition-colors">
                    {ally.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-2 pl-1">
        <div className="w-1 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0" />
        <p className="text-[10px] font-bold tracking-widest text-white uppercase font-mono">{title}</p>
      </div>
      <div className="bg-surface-card border border-surface-border rounded-lg p-4 shadow-lg">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-surface-border last:border-0 gap-4">
      <span className="text-white/50 text-[10px] font-mono uppercase tracking-widest flex-shrink-0">{label}</span>
      <span className="text-white text-xs font-medium text-right">{value}</span>
    </div>
  )
}

function Loading() {
  return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
}