// hooks/useWar.ts - VERSÃO FINAL COM ALIADOS, VITÓRIA E SAÍDA
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { Database } from '@/types/database'

export interface War {
  id: string
  attacker_id: number
  defender_id: number
  status: string
  terrain: string
  started_at: string
  damage_to_attacker: number | null
  damage_to_defender: number | null
  pending_peace_from: number | null
  attacker: {
    id: number
    name: string
    flag_emoji: string
    users?: { flag_url: string | null } | { flag_url: string | null }[] | null
  }
  defender: {
    id: number
    name: string
    flag_emoji: string
    users?: { flag_url: string | null } | { flag_url: string | null }[] | null
  }
  attacker_region?: { name: string } | null
  defender_region?: { name: string } | null
  participants?: any[] 
}

type CombatXPRow = Database['public']['Tables']['combat_xp']['Row']
export interface CombatXP extends CombatXPRow {}

type RpcAttackResult = {
  success: boolean
  damage_dealt: number
  losses_suffered: number
  victory?: boolean
  winner_id?: number | null
  loser_id?: number | null
  error?: string
}

type RpcSimpleResult = {
  success: boolean
  message?: string
  error?: string
}

export function useWar() {
  const { country } = useAuthStore()
  const [myWars, setMyWars] = useState<War[]>([])
  const [worldWars, setWorldWars] = useState<War[]>([])
  const [military, setMilitary] = useState<any>(null)
  const [combatXP, setCombatXP] = useState<CombatXP | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

  const fetchAll = useCallback(async () => {
    if (!country?.id) {
      setMyWars([])
      setWorldWars([])
      setMilitary(null)
      setCombatXP(null)
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === country.id) return

    fetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const selectQuery = `
        *,
        attacker:countries!wars_attacker_id_fkey(id, name, flag_emoji, users(flag_url)),
        defender:countries!wars_defender_id_fkey(id, name, flag_emoji, users(flag_url)),
        attacker_region:regions!wars_attacker_region_id_fkey(name),
        defender_region:regions!wars_defender_region_id_fkey(name),
        participants:war_participants(
          country_id, 
          side,
          damage_dealt,
          country:countries(id, name, flag_emoji, users(flag_url))
        )
      `;

      const [allWarsData, militaryData, combatXPData] = await Promise.all([
        supabase
          .from('wars')
          .select(selectQuery)
          .in('status', ['active', 'paused'])
          .order('started_at', { ascending: false }),

        supabase.from('military').select('*').eq('country_id', country.id).maybeSingle(),
        supabase.from('combat_xp').select('*').eq('country_id', country.id).maybeSingle(),
      ])

      const allWars = (allWarsData?.data as any[]) || []

      // Filtrando "Minhas Guerras" (Atacante, Defensor ou Aliado)
      const myWarsFiltered = allWars.filter(w => 
        Number(w.attacker_id) === Number(country.id) || 
        Number(w.defender_id) === Number(country.id) || 
        w.participants?.some((p: any) => Number(p.country_id) === Number(country.id))
      )

      // Filtrando "Guerras do Mundo"
      const worldWarsFiltered = allWars.filter(w => 
        w.status === 'active' &&
        Number(w.attacker_id) !== Number(country.id) && 
        Number(w.defender_id) !== Number(country.id) && 
        !w.participants?.some((p: any) => Number(p.country_id) === Number(country.id))
      ).slice(0, 20)

      // Debug no console F12:
      console.log('Minhas Guerras:', myWarsFiltered)
      console.log('Guerras do Mundo:', worldWarsFiltered)

      setMyWars(myWarsFiltered)
      setWorldWars(worldWarsFiltered)
      setMilitary(militaryData?.data ?? null)
      setCombatXP(combatXPData?.data ? (combatXPData.data as CombatXP) : null)

      lastLoadedIdRef.current = country.id
    } catch (err: any) {
      console.error('❌ Erro ao buscar dados de guerra:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [country?.id])

  useEffect(() => {
    if (country?.id && lastLoadedIdRef.current !== country.id) fetchAll()
    else if (!country?.id) {
      setMyWars([]); setWorldWars([]); setMilitary(null); setCombatXP(null); setLoading(false)
    }
  }, [country?.id, fetchAll])

  async function declareWar(targetId: number): Promise<RpcSimpleResult> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }
    const { data, error } = await supabase.rpc('declare_war', {
      p_attacker_id: country.id, p_defender_id: targetId,
    })
    await fetchAll()
    if (error) return { success: false, error: error.message }
    return (data as RpcSimpleResult) ?? { success: false, error: 'Erro desconhecido' }
  }

  async function attack(warId: string, unitType: string, quantity: number): Promise<RpcAttackResult> {
    if (!country?.id) return { success: false, error: 'País não encontrado', damage_dealt: 0, losses_suffered: 0 }
    try {
      const { data, error } = await supabase.rpc('attack', {
        p_war_id: warId, p_attacker_id: country.id, p_unit_type: unitType, p_quantity: quantity,
      })
      if (error) throw error
      lastLoadedIdRef.current = null
      await fetchAll()
      return (data as RpcAttackResult) ?? { success: false, error: 'Erro', damage_dealt: 0, losses_suffered: 0 }
    } catch (err: any) {
      return { success: false, error: err.message, damage_dealt: 0, losses_suffered: 0 }
    }
  }

  async function proposePeace(warId: string): Promise<RpcSimpleResult> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }
    const { data, error } = await supabase.rpc('propose_peace', { p_war_id: warId, p_country_id: country.id })
    await fetchAll()
    if (error) return { success: false, error: error.message }
    return (data as RpcSimpleResult) ?? { success: false, error: 'Erro desconhecido' }
  }

  async function acceptPeace(warId: string): Promise<RpcSimpleResult> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }
    const { data, error } = await supabase.rpc('accept_peace', { p_war_id: warId, p_country_id: country.id })
    lastLoadedIdRef.current = null
    await fetchAll()
    if (error) return { success: false, error: error.message }
    return (data as RpcSimpleResult) ?? { success: false, error: 'Erro desconhecido' }
  }

  async function rejectPeace(warId: string): Promise<RpcSimpleResult> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }
    const { data, error } = await supabase.rpc('reject_peace', { p_war_id: warId, p_country_id: country.id })
    lastLoadedIdRef.current = null
    await fetchAll()
    if (error) return { success: false, error: error.message }
    return (data as RpcSimpleResult) ?? { success: false, error: 'Erro desconhecido' }
  }

  async function proposeJoinWar(warId: string, side: 'attacker' | 'defender', targetCountryId: number): Promise<RpcSimpleResult> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }

    const { data: existingParticipant } = await supabase
      .from('war_participants')
      .select('id')
      .eq('war_id', warId)
      .eq('country_id', country.id)
      .maybeSingle()

    if (existingParticipant) {
      return { success: false, error: 'Você já é um participante desta guerra.' }
    }
    
    const { error } = await supabase.from('laws').insert({
      country_id: country.id,
      law_catalog_id: 11,
      status: 'active',
      approved_at: new Date().toISOString(),
      forced_approval: false,
      data: {
        target_war_id: warId,
        target_text: side,
        target_country_id: targetCountryId
      }
    })

    if (error) return { success: false, error: error.message }
    return { success: true, message: `Proposta enviada ao parlamento para lutar pelo lado ${side === 'attacker' ? 'Atacante' : 'Defensor'}!` }
  }

  async function leaveWar(warId: string): Promise<RpcSimpleResult> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }
    
    const { error } = await supabase
      .from('war_participants')
      .delete()
      .eq('war_id', warId)
      .eq('country_id', country.id)

    if (error) return { success: false, error: error.message }
    
    lastLoadedIdRef.current = null
    await fetchAll() 
    
    return { success: true, message: 'Você se retirou da guerra. Seu dano anterior foi mantido no placar.' }
  }

  return {
    myWars, worldWars, military, combatXP, loading, error,
    declareWar, attack, proposePeace, acceptPeace, rejectPeace,
    proposeJoinWar, leaveWar,
    refetch: fetchAll,
  }
}