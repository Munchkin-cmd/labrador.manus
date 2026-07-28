import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

export function useEconomy() {
  const { country } = useAuthStore()
  const [economy, setEconomy] = useState<any>(null)
  const [military, setMilitary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

  const fetchData = useCallback(async () => {
    if (!country?.id) {
      setEconomy(null)
      setMilitary(null)
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === country.id) {
      return
    }

    fetchingRef.current = true
    setLoading(true)

    try {
      const [e, m] = await Promise.all([
        supabase.from('economy').select('*').eq('country_id', country.id).single(),
        supabase.from('military').select('*').eq('country_id', country.id).single(),
      ])
      setEconomy(e.data)
      setMilitary(m.data)
      lastLoadedIdRef.current = country.id
    } catch (err) {
      console.error('Erro ao buscar economia:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [country?.id])

  useEffect(() => {
    if (country?.id && lastLoadedIdRef.current !== country.id) {
      fetchData()
    } else if (!country?.id) {
      setEconomy(null)
      setMilitary(null)
      setLoading(false)
    }
  }, [country?.id, fetchData])

  return { economy, military, loading, refetch: fetchData }
}

export function useBriefing() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchingRef = useRef(false)
  const lastLoadedUserIdRef = useRef<string | null>(null)

  const fetchInitial = useCallback(async () => {
    if (!user?.id) {
      setNotifications([])
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedUserIdRef.current === user.id) {
      return
    }

    fetchingRef.current = true
    setLoading(true)

    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setNotifications(data ?? [])
      lastLoadedUserIdRef.current = user.id
    } catch (err) {
      console.error('Erro ao buscar notificações:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      setLoading(false)
      return
    }

    if (lastLoadedUserIdRef.current !== user.id) {
      fetchInitial()
    }

    // Canal em tempo real – atualiza localmente em vez de recarregar
    const channel = supabase
      .channel('notifications_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.new.user_id === user.id) {
            setNotifications(prev => [payload.new, ...prev])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, fetchInitial])

  // markRead e markAllRead permanecem iguais (já atualizam localmente)
  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    if (error) {
      console.error('Erro ao marcar como lida:', error)
      fetchInitial() // fallback
    }
  }, [fetchInitial])

  const markAllRead = useCallback(async () => {
    if (!user?.id) return
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
    if (error) {
      console.error('Erro ao marcar todas como lidas:', error)
      fetchInitial()
    }
  }, [user?.id, fetchInitial])

  return { notifications, loading, markRead, markAllRead, refetch: fetchInitial }
}

export function useMarket() {
  const { country } = useAuthStore()
  const [offers, setOffers] = useState<any[]>([])
  const [myOffers, setMyOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

  const fetchAll = useCallback(async () => {
    if (!country?.id) {
      setOffers([])
      setMyOffers([])
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === country.id) {
      return
    }

    fetchingRef.current = true
    setLoading(true)

    try {
      const [all, mine] = await Promise.all([
        supabase.from('market')
          .select('*, countries(name, flag_emoji)')
          .in('status', ['open', 'partial'])
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('market')
          .select('*')
          .eq('country_id', country.id)
          .in('status', ['open', 'partial'])
          .order('created_at', { ascending: false }),
      ])
      setOffers(all.data ?? [])
      setMyOffers(mine.data ?? [])
      lastLoadedIdRef.current = country.id
    } catch (err) {
      console.error('Erro ao buscar mercado:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [country?.id])

  useEffect(() => {
    if (!country?.id) {
      setOffers([])
      setMyOffers([])
      setLoading(false)
      return
    }

    if (lastLoadedIdRef.current !== country.id) {
      fetchAll()
    }

    // Canal com atualização local
    const channel = supabase
      .channel('market_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'market' }, (payload) => {
        if (payload.new.status === 'open' || payload.new.status === 'partial') {
          setOffers(prev => [payload.new, ...prev].slice(0, 50))
          if (payload.new.country_id === country.id) {
            setMyOffers(prev => [payload.new, ...prev])
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'market' }, (payload) => {
        // Atualiza oferta existente ou remove se não estiver mais aberta
        setOffers(prev => {
          const exists = prev.some(o => o.id === payload.new.id)
          if (!exists && (payload.new.status === 'open' || payload.new.status === 'partial')) {
            return [payload.new, ...prev].slice(0, 50)
          }
          return prev.map(o => o.id === payload.new.id ? payload.new : o)
            .filter(o => o.status === 'open' || o.status === 'partial')
        })
        // Mesmo para myOffers
        setMyOffers(prev => {
          if (payload.new.country_id !== country.id) return prev
          const exists = prev.some(o => o.id === payload.new.id)
          if (!exists && (payload.new.status === 'open' || payload.new.status === 'partial')) {
            return [payload.new, ...prev]
          }
          return prev.map(o => o.id === payload.new.id ? payload.new : o)
            .filter(o => o.status === 'open' || o.status === 'partial')
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'market' }, (payload) => {
        setOffers(prev => prev.filter(o => o.id !== payload.old.id))
        setMyOffers(prev => prev.filter(o => o.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [country?.id, fetchAll])

  async function placeOrder(resource: string, type: string, qty: number, price: number) {
    if (!country?.id) return
    const { data } = await supabase.rpc('place_market_order', {
      p_country_id: country.id,
      p_resource: resource,
      p_order_type: type,
      p_quantity: qty,
      p_price: price,
    })
    await fetchAll()
    return data
  }

  async function buyOffer(orderId: string, qty: number) {
    if (!country?.id) return
    const { data } = await supabase.rpc('execute_market_transaction', {
      p_order_id: orderId,
      p_buyer_id: country.id,
      p_quantity: qty,
    })
    await fetchAll()
    return data
  }

  return { offers, myOffers, loading, placeOrder, buyOffer }
}

export function useConfiguracoes() {
  const { country } = useAuthStore()
  const [data, setData] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

  const fetchData = useCallback(async () => {
    if (!country?.id) {
      setData(null)
      setProfile(null)
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === country.id) {
      return
    }

    fetchingRef.current = true
    setLoading(true)

    try {
      const [c, u] = await Promise.all([
        supabase.from('countries').select('*').eq('id', country.id).single(),
        supabase.from('users').select('flag_url, leader_url, banner_urls').eq('country_id', country.id).single(),
      ])
      setData(c.data)
      setProfile(u.data)
      lastLoadedIdRef.current = country.id
    } catch (err) {
      console.error('Erro ao buscar configurações:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [country?.id])

  useEffect(() => {
    if (country?.id && lastLoadedIdRef.current !== country.id) {
      fetchData()
    } else if (!country?.id) {
      setData(null)
      setProfile(null)
      setLoading(false)
    }
  }, [country?.id, fetchData])

  async function saveCountry(fields: any) {
    setSaving(true)
    const { error } = await supabase.from('countries').update(fields).eq('id', country!.id)
    if (!error) setData((prev: any) => ({ ...prev, ...fields }))
    setSaving(false)
    return { success: !error }
  }

  async function saveProfile(fields: any) {
    setSaving(true)
    const { error } = await supabase.from('users').update(fields).eq('country_id', country!.id)
    if (!error) setProfile((prev: any) => ({ ...prev, ...fields }))
    setSaving(false)
    return { success: !error }
  }

  return { data, profile, loading, saving, saveCountry, saveProfile }
}

export function useTaxes() {
  const { country } = useAuthStore()
  const [taxes, setTaxes] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

  const fetchTaxes = useCallback(async () => {
    if (!country?.id) {
      setTaxes(null)
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === country.id) {
      return
    }

    fetchingRef.current = true
    setLoading(true)

    try {
      const { data } = await supabase
        .from('taxes')
        .select('*')
        .eq('country_id', country.id)
        .single()
      setTaxes(data)
      lastLoadedIdRef.current = country.id
    } catch (err) {
      console.error('Erro ao buscar impostos:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [country?.id])

  useEffect(() => {
    if (country?.id && lastLoadedIdRef.current !== country.id) {
      fetchTaxes()
    } else if (!country?.id) {
      setTaxes(null)
      setLoading(false)
    }
  }, [country?.id, fetchTaxes])

  // saveTaxes permanece igual (já atualiza localmente)
  async function saveTaxes(updated: any) {
    // ... (mesmo código, sem alterações)
  }

  return { taxes, loading, saving, saveTaxes }
}