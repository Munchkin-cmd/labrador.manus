'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCountry } from '@/hooks/useCountry'
import { useAuthStore } from '@/store/authStore'
import TrustBar from '@/components/home/TrustBar'
import { formatMoney, formatNumber } from '@/utils/format'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database'

const TERRAIN_INFO: Record<string, { label: string; emoji: string; resources: string }> = {
  planicie:   { label: 'Planície',  emoji: '🌾', resources: 'Madeira, Petróleo, Carvão' },
  orogenico:  { label: 'Orogênico', emoji: '⛰️', resources: 'Ouro, Ferro, Urânio' },
  extremista: { label: 'Extremista',emoji: '🏜️', resources: 'Petróleo, Urânio' },
  anfibio:    { label: 'Ânfibio',   emoji: '🌊', resources: 'Madeira, Ouro, Petróleo' },
}

// ✅ Usa o tipo exato do Supabase
type MilitaryData = Partial<Database['public']['Tables']['military']['Row']>

export default function PassaportePage() {
  const { country } = useAuthStore()
  const { data, economy, profile, loading } = useCountry()
  
  // ─── ESTADOS EXTRAS ─────────────────────────────────────────
  const [military, setMilitary] = useState<MilitaryData | null>(null)
  const [losses, setLosses] = useState<MilitaryData | null>(null)
  const [destroyedBuildings, setDestroyedBuildings] = useState(0)
  const [warStats, setWarStats] = useState({ wins: 0, losses: 0 })
  const [allies, setAllies] = useState<any[]>([])

  useEffect(() => {
    if (!country?.id) return
    fetchExtras()
  }, [country?.id])

  async function fetchExtras() {
    if (!country?.id) return

    const { data: mil } = await supabase
      .from('military')
      .select('*')
      .eq('country_id', country.id)
      .single()
    setMilitary(mil as MilitaryData)

    const { data: lossesData } = await supabase
      .from('military_losses')
      .select('soldiers, tanks, aircraft, helicopters, drones, missiles, warheads, artillery')
      .eq('country_id', country.id)
    if (lossesData) {
      const totals = lossesData.reduce((acc, curr) => ({
        soldiers: (acc.soldiers || 0) + (curr.soldiers || 0),
        tanks: (acc.tanks || 0) + (curr.tanks || 0),
        aircraft: (acc.aircraft || 0) + (curr.aircraft || 0),
        helicopters: (acc.helicopters || 0) + (curr.helicopters || 0),
        drones: (acc.drones || 0) + (curr.drones || 0),
        missiles: (acc.missiles || 0) + (curr.missiles || 0),
        warheads: (acc.warheads || 0) + (curr.warheads || 0),
        artillery: (acc.artillery || 0) + (curr.artillery || 0),
      }), {} as MilitaryData)
      setLosses(totals)
    }

    const { count: destroyed } = await supabase
      .from('destroyed_buildings')
      .select('*', { count: 'exact', head: true })
      .eq('country_id', country.id)
    setDestroyedBuildings(destroyed || 0)

    const { data: wars } = await supabase
      .from('wars')
      .select('attacker_id, defender_id, status')
      .or(`attacker_id.eq.${country.id},defender_id.eq.${country.id}`)
      .eq('status', 'peace')
    let wins = 0, lossesCount = 0
    wars?.forEach(w => {
      if (w.status === 'peace') {
        if (w.attacker_id === country.id) wins++
        else lossesCount++
      }
    })
    setWarStats({ wins, losses: lossesCount })

    const { data: alliesData } = await supabase
      .from('diplomacy')
      .select('country_a_id, country_b_id, countries!diplomacy_country_a_id_fkey(name, flag_emoji, slug), countries!diplomacy_country_b_id_fkey(name, flag_emoji, slug)')
      .or(`country_a_id.eq.${country.id},country_b_id.eq.${country.id}`)
      .eq('status', 'ally')
    if (alliesData) {
      const formatted = alliesData.map(d => {
        if (d.country_a_id === country.id) return d.countries
        return d.countries
      }).filter(Boolean)
      setAllies(formatted)
    }
  }

  if (loading) return <Loading />
  if (!data || !economy) return null

  const terrain = TERRAIN_INFO[data.terrain] ?? { label: data.terrain, emoji: '🗺️', resources: '—' }

  const equipmentList = [
    { key: 'soldiers', label: 'Soldados', emoji: '⚔️' },
    { key: 'tanks', label: 'Tanques', emoji: '🛡️' },
    { key: 'artillery', label: 'Artilharia', emoji: '💣' },
    { key: 'aircraft', label: 'Aeronaves', emoji: '✈️' },
    { key: 'helicopters', label: 'Helicópteros', emoji: '🚁' },
    { key: 'drones', label: 'Drones', emoji: '🤖' },
    { key: 'missiles', label: 'Mísseis', emoji: '🎯' },
    { key: 'warheads', label: 'Ogivas', emoji: '☢️' },
  ]

  return (
    <div className="flex flex-col gap-5 pb-6">

      {/* Capa do passaporte */}
      <div className="relative h-48 bg-gradient-to-br from-primary-dark via-secondary-dark to-black overflow-hidden">
        {profile?.banner_urls?.[0] && (
          <img src={profile.banner_urls[0]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
          {profile?.flag_url ? (
            <img src={profile.flag_url} alt="Bandeira" className="w-16 h-10 object-cover rounded shadow-lg" />
          ) : (
            <span className="text-5xl">{data.flag_emoji}</span>
          )}
          <h2 className="text-white font-black text-xl text-center">{data.name}</h2>
          <p className="text-white/50 text-sm">{data.capital}</p>
        </div>
      </div>

      {/* Informações */}
      <div className="px-4 flex flex-col gap-4">

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
          <Row label="Regiões"         value={`${data.total_regions}`} />
        </Section>

        <Section title="STATUS">
          <div className="flex flex-col gap-2 pt-1">
            <TrustBar trust={data.trust}           label="Confiança"   color="bg-green-500" />
            <TrustBar trust={data.intl_approval}   label="Aprovação"   color="bg-blue-400" />
            <TrustBar trust={data.political_power} label="Poder Pol."  color="bg-purple-400" />
          </div>
        </Section>

        {/* ─── ESTATÍSTICAS NACIONAIS (Infraestrutura + Guerras) ── */}
        <Section title="ESTATÍSTICAS NACIONAIS">
          <div className="bg-white/5 rounded-lg p-3">
            <Row label="Infraestrutura destruída" value={`${destroyedBuildings} edifícios`} />
            <Row label="Guerras vencidas" value={`${warStats.wins}`} />
            <Row label="Guerras perdidas" value={`${warStats.losses}`} />
          </div>
        </Section>

        {/* ─── MILITARES (Equipamentos + Baixas) ──────────────── */}
        <Section title="MILITARES">
          <div className="flex flex-col gap-3">
            {equipmentList.map(item => {
              const stock = military?.[item.key as keyof MilitaryData] || 0
              const lost = losses?.[item.key as keyof MilitaryData] || 0
              return (
                <div key={item.key} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <p className="text-white font-semibold">{item.label}</p>
                      <p className="text-white/30 text-xs">Em estoque: {formatNumber(Number(stock))}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 text-xs font-semibold">Baixas: {formatNumber(Number(lost))}</p>
                    <p className="text-white/30 text-[10px]">Destruídos em guerra</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* ─── ALIADOS ──────────────────────────────────────────── */}
        <Section title="🤝 ALIADOS">
          {allies.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-2">Nenhum aliado ativo</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allies.map((ally, idx) => (
                <Link
                  key={idx}
                  href={`/game/pais/${ally.slug}`}
                  className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 hover:bg-green-500/20 transition-colors"
                >
                  <span className="text-xl">{ally.flag_emoji || '🌐'}</span>
                  <span className="text-white text-sm font-semibold">{ally.name}</span>
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
    <div>
      <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2">{title}</p>
      <div className="bg-surface-card rounded-xl p-3">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-white/5 last:border-0 gap-4">
      <span className="text-white/40 text-sm flex-shrink-0">{label}</span>
      <span className="text-white text-sm font-medium text-right">{value}</span>
    </div>
  )
}

function Loading() {
  return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
}