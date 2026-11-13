import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'

interface CountrySummary {
  id: number
  name: string
  flag_emoji: string
  flag_url?: string | null // ✅ Adicionado para suportar bandeira personalizada
}

interface AuthState {
  user: { id: string; email: string } | null
  country: CountrySummary | null
  loading: boolean
  setUser: (user: AuthState['user']) => void
  setCountry: (country: CountrySummary | null) => void
  setLoading: (loading: boolean) => void
  fetchUserCountry: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  country: null,
  loading: true,

  setUser: (user) => {
    const current = get().user
    if (user === null && current === null) return
    if (user && current && user.id === current.id && user.email === current.email) return
    set({ user })
  },

  setCountry: (country) => {
    const current = get().country
    if (country === null && current === null) return
    if (country && current && country.id === current.id && country.name === current.name && country.flag_emoji === current.flag_emoji && country.flag_url === current.flag_url) return
    set({ country })
  },

  setLoading: (loading) => {
    set({ loading })
  },

  fetchUserCountry: async () => {
    const { user } = get()
    if (!user) {
      set({ country: null, loading: false })
      return
    }

    console.log('🔍 fetchUserCountry: buscando país para user.id:', user.id)

    try {
      // 1. Busca o country_id e a flag_url na tabela users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('country_id, flag_url')
        .eq('user_id', user.id)
        .maybeSingle()

      if (userError) {
        console.error('❌ Erro ao buscar dados do usuário:', userError)
        set({ country: null, loading: false })
        return
      }

      if (!userData?.country_id) {
        console.warn('⚠️ Usuário sem país associado.')
        set({ country: null, loading: false })
        return
      }

      // 2. Busca os dados básicos do país
      const { data: countryData, error: countryError } = await supabase
        .from('countries')
        .select('id, name, flag_emoji')
        .eq('id', userData.country_id)
        .maybeSingle()

      if (countryError) {
        console.error('❌ Erro ao buscar país:', countryError)
        set({ country: null, loading: false })
        return
      }

      if (countryData) {
        console.log('✅ País encontrado:', countryData)
        // Junta os dados do país com a flag_url que estava na tabela users
        get().setCountry({
          ...countryData,
          flag_url: userData.flag_url
        })
      } else {
        console.warn('⚠️ País não encontrado para country_id:', userData.country_id)
        set({ country: null })
      }
    } catch (err) {
      console.error('❌ Erro inesperado:', err)
      set({ country: null })
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, country: null, loading: false })
  },
}))