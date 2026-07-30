import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database'

export function createClient() {
  try {
    const cookieStore = cookies()
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                const secure = process.env.NODE_ENV === 'production'
                cookieStore.set(name, value, {
                  ...options,
                  secure,
                  sameSite: 'lax',
                  httpOnly: true,
                })
              })
            } catch {
              // Ignora erros em Server Components
            }
          },
        },
      }
    )
  } catch (error) {
    console.warn('⚠️ Modo API: criando cliente sem cookies.')
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return [] },
          setAll() {},
        },
      }
    )
  }
}