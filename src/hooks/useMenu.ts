import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

export function useBriefing() {
  const { country } = useAuthStore()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

  // ✅ FETCH: Traz APENAS notificações não-lidas
  const fetchInitial = useCallback(async () => {
    if (!country?.id) {
      console.log('⚠️ [useBriefing] country?.id não definido')
      setNotifications([])
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === country.id) {
      console.log('⏭️ [useBriefing] Pulando fetch - já carregado ou em progresso')
      return
    }

    fetchingRef.current = true
    setLoading(true)

    try {
      console.log('📡 [useBriefing] Buscando notificações não-lidas para country_id:', country.id)
      
      // ✅ FILTRA APENAS is_read: false
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('country_id', country.id)
        .eq('is_read', false)  // ← IMPORTANTE: Só não-lidas
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('❌ [useBriefing] Erro ao buscar:', error)
        throw error
      }

      console.log('✅ [useBriefing] Notificações não-lidas recebidas:', data?.length || 0)
      setNotifications(data ?? [])
      lastLoadedIdRef.current = country.id

    } catch (err) {
      console.error('❌ [useBriefing] Erro crítico:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [country?.id])

  // ✅ REALTIME: Escuta UPDATE no banco para sincronizar estado
  useEffect(() => {
    if (!country?.id) {
      setNotifications([])
      setLoading(false)
      return
    }

    if (lastLoadedIdRef.current !== country.id) {
      fetchInitial()
    }

    console.log('📡 [useBriefing] Inscrevendo no Realtime channel')
    
    const channel = supabase
      .channel(`notifications_${country.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('🆕 [useBriefing] Nova notificação INSERT:', payload.new.id)
          if (payload.new.country_id === country.id && !payload.new.is_read) {
            // ✅ Só adiciona se for não-lida
            setNotifications(prev => [payload.new, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('🔄 [useBriefing] Notificação UPDATE:', payload.new.id, 'is_read:', payload.new.is_read)
          
          if (payload.new.country_id === country.id) {
            if (payload.new.is_read) {
              // ✅ Se foi marcada como lida, REMOVE da lista
              setNotifications(prev => prev.filter(n => n.id !== payload.new.id))
              console.log('✅ [useBriefing] Notificação removida da lista (foi lida)')
            } else {
              // Se ainda não está lida, atualiza
              setNotifications(prev =>
                prev.map(n => (n.id === payload.new.id ? payload.new : n))
              )
            }
          }
        }
      )
      .subscribe()

    return () => {
      console.log('❌ [useBriefing] Desinstalando Realtime channel')
      supabase.removeChannel(channel)
    }
  }, [country?.id, fetchInitial])

  // ✅ MARK SINGLE: Marca UMA notificação como lida
  const markRead = useCallback(async (id: string) => {
    console.log('📍 [useBriefing] markRead() chamado para:', id)
    
    // Atualização otimista: REMOVE da lista imediatamente
    setNotifications(prev => {
      const remaining = prev.filter(n => n.id !== id)
      console.log('✅ [useBriefing] Removido localmente. Restam:', remaining.length)
      return remaining
    })

    // Atualiza no banco
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) {
      console.error('❌ [useBriefing] Erro ao marcar como lida:', error)
      // Reverte se houver erro
      fetchInitial()
    } else {
      console.log('✅ [useBriefing] Marcada como lida no banco')
    }
  }, [fetchInitial])

  // ✅ MARK ALL: Marca TODAS as notificações como lidas
  const markAllRead = useCallback(async () => {
    if (!country?.id) return

    console.log('📋 [useBriefing] markAllRead() chamado. Notificações:', notifications.length)

    // Atualização otimista: limpa a lista
    const notificationIds = notifications.map(n => n.id)
    setNotifications([])
    console.log('✅ [useBriefing] Lista limpa localmente')

    // ✅ QUERY DIRETA (sem RPC) - atualiza todas não-lidas para lidas
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('country_id', country.id)
      .eq('is_read', false)  // Só atualiza as que ainda estão não-lidas

    if (error) {
      console.error('❌ [useBriefing] Erro ao marcar todas como lidas:', error)
      // Reverte se houver erro
      fetchInitial()
    } else {
      console.log('✅ [useBriefing] Todas marcadas como lidas no banco')
    }
  }, [country?.id, notifications, fetchInitial])

  return {
    notifications,
    loading,
    markRead,
    markAllRead,
    refetch: fetchInitial,
  }
}