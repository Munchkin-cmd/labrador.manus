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
  const { country } = useAuthStore()
  const [data, setData] = useState<CountryFull | null>(null)
  const [economy, setEconomy] = useState<Economy | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchAll = useCallback(async () => {
    console.log('🔵 [useCountry] fetchAll executado, country:', country)

    if (!country?.id) {
      console.log('🔴 [useCountry] Sem país, limpando dados')
      setData(null)
      setEconomy(null)
      setProfile(null)
      setLoading(false)
      return
    }

    if (fetchingRef.current) {
      console.log('⏸️ [useCountry] Já está carregando, ignorando')
      return
    }

    if (lastLoadedIdRef.current === country.id) {
      console.log(`⏹️ [useCountry] País ${country.id} já carregado, ignorando`)
      return
    }

    console.log(`🟡 [useCountry] Iniciando requisição para país ${country.id}`)
    fetchingRef.current = true
    setLoading(true)
    setError(null)

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (fetchingRef.current) {
        console.warn('⏰ [useCountry] Timeout – forçando loading false')
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
        .eq('id', country.id)
        .maybeSingle()

      console.log('📦 [useCountry] Resposta do Supabase:', { result, err })

      if (err) throw err

      if (result) {
        setData(result)

        // 🔥 CORREÇÃO: `economy` é um objeto (porque é to-one)
        setEconomy(result.economy || null)

        // 🔥 CORREÇÃO: `users` é um array – pegamos o primeiro ou null
        const user = result.users && Array.isArray(result.users) && result.users.length > 0
          ? result.users[0]
          : null

        setProfile(user ? {
          flag_url: user.flag_url ?? null,
          leader_url: user.leader_url ?? null,
          banner_urls: user.banner_urls ?? [],
        } : null)

        lastLoadedIdRef.current = country.id
        console.log(`✅ [useCountry] Dados carregados para país ${country.id}`)
      } else {
        console.warn(`⚠️ [useCountry] Nenhum dado encontrado para país ${country.id}`)
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
      console.log(`🔚 [useCountry] loading setado para false`)
    }
  }, [country])

  useEffect(() => {
    console.log(`🔄 [useCountry] useEffect executou, country.id: ${country?.id}, lastLoaded: ${lastLoadedIdRef.current}`)

    if (country?.id && lastLoadedIdRef.current !== country.id) {
      fetchAll()
    } else if (!country?.id) {
      setData(null)
      setEconomy(null)
      setProfile(null)
      setLoading(false)
    } else {
      console.log(`ℹ️ [useCountry] Nenhuma ação necessária (país já carregado)`)
    }
  }, [country, fetchAll])

  return {
    data,
    economy,
    profile,
    loading,
    error,
    refetch: () => {
      console.log('🔄 [useCountry] Refetch manual')
      lastLoadedIdRef.current = null
      fetchAll()
    },
  }
}