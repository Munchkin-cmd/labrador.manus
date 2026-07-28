import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'

interface CountrySummary {
  id: number
  name: string
  flag_emoji: string
}

interface AuthState {
  user: { id: string; email: string } | null
  country: CountrySummary | null
  loading: boolean
  setUser: (user: AuthState['user']) => void
  setCountry: (country: CountrySummary | null) => void
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
    if (country && current && country.id === current.id && country.name === current.name && country.flag_emoji === current.flag_emoji) return
    set({ country })
  },

  fetchUserCountry: async () => {
    const { user } = get()
    if (!user) {
      set({ country: null, loading: false })
      return
    }

    console.log('🔍 fetchUserCountry: buscando país para user.id:', user.id)

    try {
      // ✅ CORREÇÃO: usar 'user_id' (coluna que referencia auth.users)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('country_id')
        .eq('user_id', user.id)  // ← AQUI! Deve ser 'user_id', não 'id'
        .maybeSingle()           // ← melhor que .single() para evitar erro se não encontrar

      if (userError) {
        console.error('❌ Erro ao buscar country_id:', userError)
        set({ country: null, loading: false })
        return
      }

      if (!userData?.country_id) {
        console.warn('⚠️ Usuário sem país associado. Execute: UPDATE users SET country_id = 14 WHERE user_id = ?')
        set({ country: null, loading: false })
        return
      }

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
        get().setCountry(countryData)
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