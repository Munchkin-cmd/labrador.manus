'use client'

import { createContext, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

export const AuthContext = createContext<null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { setUser, setCountry, setLoading } = useAuthStore()

  // ✅ Função auxiliar CORRIGIDA: Pega o ID da própria store, sem risco de undefined
  async function fetchUserCountry() {
    // Pega o usuário atual diretamente do estado global da store
    const currentUser = useAuthStore.getState().user
    if (!currentUser) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('users')
      .select('country_id')
      .eq('user_id', currentUser.id) // ✅ Agora é 100% string (sem erro TS)
      .maybeSingle()

    if (data?.country_id) {
      const { data: country } = await supabase
        .from('countries')
        .select('id, name, flag_emoji')
        .eq('id', data.country_id)
        .maybeSingle()

      if (country) {
        setCountry(country)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    let isMounted = true

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return

        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email! })
          await fetchUserCountry()
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err)
        if (isMounted) setLoading(false)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 AuthStateChange:', event, session?.user?.id)

      if (!isMounted) return

      // ✅ Corrigido: Trata o INITIAL_SESSION corretamente (essencial para evitar o 401)
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email! })
          await fetchUserCountry()
          if (pathname === '/game/home') {
            router.refresh()
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setCountry(null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [setUser, setCountry, setLoading, pathname, router])

  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>
}