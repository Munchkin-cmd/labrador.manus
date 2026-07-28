// context/AuthContext.tsx
'use client'

import { createContext, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

export const AuthContext = createContext<null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { setUser, fetchUserCountry } = useAuthStore()

  useEffect(() => {
    let isMounted = true

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!isMounted) return

        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email! })
          await fetchUserCountry()
          if (pathname === '/game/home') {
            router.refresh()
          }
        } else {
          useAuthStore.setState({ loading: false })
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err)
        if (isMounted) useAuthStore.setState({ loading: false })
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 onAuthStateChange:', event, session?.user?.id)

      // 🔥 IGNORA INITIAL_SESSION – não é um evento de logout
      if (event === 'INITIAL_SESSION') {
        console.log('⏸️ Ignorando INITIAL_SESSION')
        return
      }

      if (!isMounted) return

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email! })
          await fetchUserCountry()
          if (pathname === '/game/home') {
            router.refresh()
          }
        }
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.setState({ user: null, country: null, loading: false })
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [setUser, fetchUserCountry, pathname, router])

  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>
}