// hooks/useWar.ts
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

// ─── TIPOS ──────────────────────────────────────────────

export interface War {
  id: string
  attacker_id: number
  defender_id: number
  status: string
  terrain: string
  started_at: string
  damage_to_attacker: number | null
  damage_to_defender: number | null
  attacker: {
    name: string
    flag_emoji: string
  }
  defender: {
    name: string
    flag_emoji: string
  }
}

export interface Training {
  id: string
  equipment_type: string
  quantity: number
  quality_before: number
  quality_after: number
  progress: number
  status: string
  start_date: string
  end_date: string
}

export interface CombatXP {
  id: string
  country_id: number
  experience: number
  wars_participated: number
  updated_at: string | null
}

type RpcAttackResult = {
  success: boolean
  damage_dealt: number
  losses_suffered: number
  error?: string
}

type RpcTrainingResult = {
  success: boolean
  message?: string
  error?: string
}

type RpcSimpleResult = {
  success: boolean
  message?: string
  error?: string
}

// ─── HOOK ────────────────────────────────────────────────

export function useWar() {
  const { country } = useAuthStore()
  const [myWars, setMyWars] = useState<War[]>([])
  const [worldWars, setWorldWars] = useState<War[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [military, setMilitary] = useState<any>(null)
  const [combatXP, setCombatXP] = useState<CombatXP | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

  // ─── BUSCAR DADOS (com cache e lock) ──────────────────

  const fetchAll = useCallback(async () => {
    if (!country?.id) {
      setMyWars([])
      setWorldWars([])
      setTrainings([])
      setMilitary(null)
      setCombatXP(null)
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === country.id) {
      return
    }

    fetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      // 1. Buscar guerras (IDs) + todos os países
      const [myWarsData, worldWarsData, trainingData, militaryData, combatXPData, allCountries] =
        await Promise.all([
          // Minhas guerras (ativas e pausadas)
          supabase
            .from('wars')
            .select('id, attacker_id, defender_id, status, terrain, started_at, damage_to_attacker, damage_to_defender')
            .or(`attacker_id.eq.${country.id},defender_id.eq.${country.id}`)
            .in('status', ['active', 'paused']),

          // Guerras do mundo (apenas ativas)
          supabase
            .from('wars')
            .select('id, attacker_id, defender_id, status, terrain, started_at, damage_to_attacker, damage_to_defender')
            .eq('status', 'active')
            .order('started_at', { ascending: false })
            .limit(20),

          // Treinamentos
          supabase
            .from('military_training')
            .select('*')
            .eq('country_id', country.id)
            .order('created_at', { ascending: false })
            .limit(10),

          // Militar
          supabase
            .from('military')
            .select('*')
            .eq('country_id', country.id)
            .maybeSingle(),

          // XP de combate
          supabase
            .from('combat_xp')
            .select('*')
            .eq('country_id', country.id)
            .maybeSingle(),

          // Todos os países (para enriquecer guerras)
          supabase.from('countries').select('id, name, flag_emoji'),
        ])

      // 2. Criar map de países
      const countryMap = new Map()
      ;(allCountries.data ?? []).forEach((c: any) => {
        countryMap.set(c.id, { name: c.name, flag_emoji: c.flag_emoji })
      })

      // 3. Enriquecer guerras
      const enrichWars = (wars: any[]) =>
        wars.map((war: any) => ({
          ...war,
          attacker: countryMap.get(war.attacker_id) ?? { name: 'Desconhecido', flag_emoji: '🌐' },
          defender: countryMap.get(war.defender_id) ?? { name: 'Desconhecido', flag_emoji: '🌐' },
        }))

      setMyWars(enrichWars(myWarsData.data ?? []))
      setWorldWars(enrichWars(worldWarsData.data ?? []))
      setTrainings(trainingData.data ?? [])
      setMilitary(militaryData.data || null)
      setCombatXP(combatXPData.data as CombatXP || null)

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
    if (country?.id && lastLoadedIdRef.current !== country.id) {
      fetchAll()
    } else if (!country?.id) {
      setMyWars([])
      setWorldWars([])
      setTrainings([])
      setMilitary(null)
      setCombatXP(null)
      setLoading(false)
    }
  }, [country?.id, fetchAll])

  // ─── AÇÕES ──────────────────────────────────────────────

  async function startTraining(equipType: string, quantity: number): Promise<RpcTrainingResult> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }

    const { data, error } = await supabase.rpc('start_military_training', {
      p_country_id: country.id,
      p_equip_type: equipType,
      p_quantity: quantity,
    })

    await fetchAll()
    if (error) return { success: false, error: error.message }
    return data ?? { success: false, error: 'Erro desconhecido' }
  }

  async function declareWar(targetId: number): Promise<RpcSimpleResult> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }

    const { data, error } = await supabase.rpc('declare_war', {
      p_attacker_id: country.id,
      p_defender_id: targetId,
    })

    await fetchAll()
    if (error) return { success: false, error: error.message }
    return data ?? { success: false, error: 'Erro desconhecido' }
  }

  async function attack(warId: string, unitType: string, quantity: number): Promise<RpcAttackResult> {
    if (!country?.id) return { success: false, error: 'País não encontrado', damage_dealt: 0, losses_suffered: 0 }

    try {
      const { data, error } = await supabase.rpc('attack', {
        p_war_id: warId,
        p_attacker_id: country.id,
        p_unit_type: unitType,
        p_quantity: quantity,
      })

      if (error) throw error

      // ✅ Após ataque bem-sucedido, ganha XP de combate
      await addCombatXP(10)

      // Recarrega dados
      await fetchAll()

      return data ?? { success: false, error: 'Erro desconhecido', damage_dealt: 0, losses_suffered: 0 }
    } catch (err: any) {
      return { success: false, error: err.message, damage_dealt: 0, losses_suffered: 0 }
    }
  }

  async function proposePeace(warId: string): Promise<RpcSimpleResult> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }

    const { data, error } = await supabase.rpc('propose_peace', {
      p_war_id: warId,
      p_country_id: country.id,
    })

    await fetchAll()
    if (error) return { success: false, error: error.message }
    return data ?? { success: false, error: 'Erro desconhecido' }
  }

  // ─── XP DE COMBATE ──────────────────────────────────────

  async function addCombatXP(amount: number) {
    if (!country?.id) return

    try {
      const currentXP = combatXP?.experience || 0
      const newXP = currentXP + amount
      const newWars = (combatXP?.wars_participated || 0) + 1

      // Usa upsert para atualizar ou inserir
      const { error } = await supabase
        .from('combat_xp')
        .upsert(
          {
            country_id: country.id,
            experience: newXP,
            wars_participated: newWars,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'country_id' }
        )

      if (error) throw error

      // Atualiza estado local
      setCombatXP(prev => ({
        id: prev?.id || '',
        country_id: country.id,
        experience: newXP,
        wars_participated: newWars,
        updated_at: new Date().toISOString(),
      }))
    } catch (err) {
      console.error('❌ Erro ao adicionar XP:', err)
    }
  }

  // ─── RETORNO ─────────────────────────────────────────────

  return {
    myWars,
    worldWars,
    trainings,
    military,
    combatXP,
    loading,
    error,
    startTraining,
    declareWar,
    attack,
    proposePeace,
    refetch: fetchAll,
  }
}