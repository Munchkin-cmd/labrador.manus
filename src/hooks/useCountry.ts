import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

export interface CountryFull {
  id: number
  name: string
  flag_emoji: string
  capital: string
  terrain: string
  motto: string | null
  leader_name: string | null
  leader_title: string
  state_structure: string
  religion: string
  currency: string
  language: string
  trust: number
  intl_approval: number
  political_power: number
  total_regions: number
  flag_url?: string | null
  is_active: boolean
}

export interface Economy {
  money: number
  food: number
  gold: number
  iron: number
  oil: number
  wood: number
  uranium: number
  coal: number
  steel: number
  energy: number
  population: number
  pollution: number
  inflation: number
  exports: number
  imports: number
  revenue?: number
  expenses?: number
}

export interface UserProfile {
  flag_url: string | null
  leader_url: string | null
  banner_urls: string[]
}

export function useCountry() {
  // 🔥 Melhor prática: selecionar apenas o ID para evitar loops de renderização
  const countryId = useAuthStore(state => state.country?.id)
  
  const [data, setData] = useState<CountryFull | null>(null)
  const [economy, setEconomy] = useState<Economy | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchAll = useCallback(async () => {
    if (!countryId) {
      setData(null)
      setEconomy(null)
      setProfile(null)
      setLoading(false)
      return
    }

    if (fetchingRef.current) {
      return
    }

    fetchingRef.current = true
    setLoading(true)
    setError(null)

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (fetchingRef.current) {
        setLoading(false)
        fetchingRef.current = false
      }
    }, 5000)

    try {
      const { data: result, error: err } = await supabase
        .from('countries')
        .select(`
          *,
          economy(*),
          users(flag_url, leader_url, banner_urls)
        `)
        .eq('id', countryId)
        .maybeSingle()

      if (err) throw err

      if (result) {
        setData(result)
        setEconomy(result.economy || null)

        const user = result.users && Array.isArray(result.users) && result.users.length > 0
          ? result.users[0]
          : null

        setProfile(user ? {
          flag_url: user.flag_url ?? null,
          leader_url: user.leader_url ?? null,
          banner_urls: user.banner_urls ?? [],
        } : null)

        lastLoadedIdRef.current = countryId
      } else {
        setData(null)
        setEconomy(null)
        setProfile(null)
      }
    } catch (err: any) {
      console.error('❌ [useCountry] Erro:', err)
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setLoading(false)
      fetchingRef.current = false
    }
  }, [countryId])

  useEffect(() => {
    // 🔥 CORREÇÃO PRINCIPAL: Sempre reseta o cache ao montar a página
    lastLoadedIdRef.current = null

    if (countryId) {
      fetchAll()
    } else {
      setData(null)
      setEconomy(null)
      setProfile(null)
      setLoading(false)
    }
  }, [countryId, fetchAll])

  return {
    data,
    economy,
    profile,
    loading,
    error,
    refetch: () => {
      lastLoadedIdRef.current = null
      fetchAll()
    },
  }
}