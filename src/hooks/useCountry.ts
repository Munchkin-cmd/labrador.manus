import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { Database } from '@/types/database'

// ─── TIPOS ──────────────────────────────────────────────────
type CountryRow = Database['public']['Tables']['countries']['Row']

export interface Economy {
  id: string
  country_id: number
  money: number
  food: number
  wood: number
  iron: number
  coal: number
  oil: number
  steel: number
  gold: number
  uranium: number
  energy: number
  population: number
  pollution: number
  revenue: number | null
  expenses: number | null
  imports: number | null
  exports: number | null
  last_production_at: string | null
  updated_at: string | null
  created_at: string
}

// ✅ RESTAURADO: Tipagem do perfil do usuário
export interface UserProfile {
  flag_url: string | null
  leader_url: string | null
  banner_urls: string[] | null
}

export interface CountryFull extends CountryRow {}

export function useCountry() {
  const { country: authCountry } = useAuthStore()
  const [data, setData] = useState<CountryFull | null>(null)
  const [economy, setEconomy] = useState<Economy | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null) // ✅ Agora usa a tipagem
  const [loading, setLoading] = useState(true)
  
  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

  const fetchCountry = useCallback(async () => {
    if (!authCountry?.id) {
      setData(null)
      setEconomy(null)
      setProfile(null)
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === authCountry.id) {
      return
    }

    fetchingRef.current = true
    setLoading(true)

    try {
      const [c, e, u] = await Promise.all([
        supabase.from('countries').select('*').eq('id', authCountry.id).maybeSingle(),
        supabase.from('economy').select('*').eq('country_id', authCountry.id).maybeSingle(),
        supabase.from('users').select('flag_url, leader_url, banner_urls').eq('country_id', authCountry.id).maybeSingle(),
      ])

      if (c.error) throw c.error
      if (e.error) throw e.error
      if (u.error) throw u.error

      setData(c.data)
      setEconomy(e.data as Economy || null)
      
      // ✅ Passando os dados do usuário corretamente
      setProfile(u.data as UserProfile || null) 
      
      lastLoadedIdRef.current = authCountry.id
    } catch (err) {
      console.error('Erro ao buscar dados do país:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [authCountry?.id])

  useEffect(() => {
    if (authCountry?.id && lastLoadedIdRef.current !== authCountry.id) {
      fetchCountry()
    } else if (!authCountry?.id) {
      setData(null)
      setEconomy(null)
      setProfile(null)
      setLoading(false)
    }
  }, [authCountry?.id, fetchCountry])

  const refetch = useCallback(() => {
    lastLoadedIdRef.current = null
    fetchCountry()
  }, [fetchCountry])

  return { data, economy, profile, loading, refetch }
}