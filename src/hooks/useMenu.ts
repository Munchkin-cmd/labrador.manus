// ============================================================
// useMenu.ts - CORRIGIDO E COMPLETO
// ============================================================

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

// ─── HOOK: ECONOMIA (usado no Armazém e Orçamento) ─────────────
export function useEconomy() {
  const { country } = useAuthStore()
  const [economy, setEconomy] = useState<any>(null)
  const [military, setMilitary] = useState<any>(null)
  const [buildings, setBuildings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

  const fetchData = useCallback(async () => {
    if (!country?.id) {
      setEconomy(null)
      setMilitary(null)
      setBuildings([])
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === country.id) {
      return
    }

    fetchingRef.current = true
    setLoading(true)

    try {
      const [e, m, b] = await Promise.all([
        supabase.from('economy').select('*').eq('country_id', country.id).maybeSingle(),
        supabase.from('military').select('*').eq('country_id', country.id).maybeSingle(),
        supabase.from('buildings').select('*').eq('country_id', country.id),
      ])

      setEconomy(e.data)
      setMilitary(m.data)
      setBuildings(b.data ?? [])
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
      setBuildings([])
      setLoading(false)
    }
  }, [country?.id, fetchData])

  return { economy, military, buildings, loading, refetch: fetchData }
}

// ─── BRIEFING (CORRIGIDO - MOSTRA TODAS E NÃO SOME AO LER) ──
export function useBriefing() {
  const { country } = useAuthStore()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

  const fetchInitial = useCallback(async () => {
    console.log('🔍 [useBriefing] fetchInitial() chamado. countryId:', country?.id)

    if (!country?.id) {
      console.warn('⚠️ [useBriefing] country?.id não definido, limpando estado')
      setNotifications([])
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === country.id) {
      console.log('⏭️ [useBriefing] Pulando fetch - já carregado ou em progresso')
      return
    }

    fetchingRef.current = true
    console.log('✅ [useBriefing] Iniciando fetch. setLoading(true)')
    setLoading(true)

    try {
      console.log('📡 [useBriefing] Buscando TODAS as notificações para country_id:', country.id)

      // ✅ REMOVIDO O FILTRO is_read: false - Agora busca TODAS (lidas e não lidas)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('country_id', country.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('❌ [useBriefing] Erro ao buscar:', error)
        throw error
      }

      console.log('✅ [useBriefing] Notificações recebidas:', data?.length || 0)
      setNotifications(data ?? [])
      lastLoadedIdRef.current = country.id
    } catch (err) {
      console.error('❌ [useBriefing] Erro crítico:', err)
    } finally {
      console.log('✅ [useBriefing] Fetch concluído. setLoading(false)')
      setLoading(false)
      fetchingRef.current = false
    }
  }, [country?.id])

  // ✅ REALTIME: Atualiza itens sem removê-los
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
          if (payload.new.country_id === country.id) {
            // ✅ Adiciona a nova notificação no topo (mesmo que já esteja lida)
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
            // ✅ Atualiza o item na lista (não remove)
            setNotifications(prev =>
              prev.map(n => (n.id === payload.new.id ? payload.new : n))
            )
          }
        }
      )
      .subscribe()

    return () => {
      console.log('❌ [useBriefing] Desinstalando Realtime channel')
      supabase.removeChannel(channel)
    }
  }, [country?.id, fetchInitial])

  // ✅ MARK READ: Atualiza localmente para is_read: true (NÃO REMOVE)
  const markRead = useCallback(async (id: string) => {
    console.log('📍 [useBriefing] markRead() chamado para:', id)

    // Atualiza o item para is_read: true sem removê-lo
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    )

    // Atualiza no banco
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) {
      console.error('❌ [useBriefing] Erro ao marcar como lida:', error)
      fetchInitial()
    } else {
      console.log('✅ [useBriefing] Marcada como lida no banco')
    }
  }, [fetchInitial])

  // ✅ MARK ALL: Atualiza todas localmente para is_read: true (NÃO LIMPA)
  const markAllRead = useCallback(async () => {
    if (!country?.id) return

    console.log('📋 [useBriefing] markAllRead() chamado. Notificações:', notifications.length)

    // Atualiza todas para is_read: true
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    )

    // ✅ QUERY DIRETA (sem RPC) - atualiza todas não-lidas para lidas
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('country_id', country.id)
      .eq('is_read', false)

    if (error) {
      console.error('❌ [useBriefing] Erro ao marcar todas como lidas:', error)
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

// ─── MARKET ─────────────────────────────────────────────────
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
        supabase
          .from('market')
          .select('*, countries(name, flag_emoji)')
          .in('status', ['open', 'partial'])
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('market')
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

    const channel = supabase
      .channel('market_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'market' },
        (payload) => {
          if (payload.new.status === 'open' || payload.new.status === 'partial') {
            setOffers(prev => [payload.new, ...prev].slice(0, 50))
            if (payload.new.country_id === country.id) {
              setMyOffers(prev => [payload.new, ...prev])
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'market' },
        (payload) => {
          setOffers(prev => {
            const exists = prev.some(o => o.id === payload.new.id)
            if (!exists && (payload.new.status === 'open' || payload.new.status === 'partial')) {
              return [payload.new, ...prev].slice(0, 50)
            }
            return prev
              .map(o => (o.id === payload.new.id ? payload.new : o))
              .filter(o => o.status === 'open' || o.status === 'partial')
          })

          setMyOffers(prev => {
            if (payload.new.country_id !== country.id) return prev
            const exists = prev.some(o => o.id === payload.new.id)
            if (!exists && (payload.new.status === 'open' || payload.new.status === 'partial')) {
              return [payload.new, ...prev]
            }
            return prev
              .map(o => (o.id === payload.new.id ? payload.new : o))
              .filter(o => o.status === 'open' || o.status === 'partial')
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'market' },
        (payload) => {
          setOffers(prev => prev.filter(o => o.id !== payload.old.id))
          setMyOffers(prev => prev.filter(o => o.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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

  async function cancelOrder(orderId: string) {
    console.log('🔍 [useMarket] cancelOrder chamado para orderId:', orderId)

    if (!country?.id) {
      console.warn('❌ País não encontrado')
      return { success: false, error: 'País não encontrado' }
    }

    try {
      console.log('🔄 [useMarket] Atualizando status para closed...')

      const { error } = await supabase
        .from('market')
        .update({ status: 'closed' })
        .eq('id', orderId)
        .eq('country_id', country.id)

      if (error) {
        console.error('❌ [useMarket] Erro ao atualizar:', error)
        throw error
      }

      console.log('✅ [useMarket] Status atualizado com sucesso')

      await fetchAll()

      return { success: true, message: 'Oferta cancelada' }
    } catch (err: any) {
      console.error('❌ [useMarket] Erro no cancelOrder:', err)
      return { success: false, error: err.message }
    }
  }

  return { offers, myOffers, loading, placeOrder, buyOffer, cancelOrder, refetch: fetchAll }
}

// ─── CONFIGURAÇÕES ──────────────────────────────────────────
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
        supabase.from('countries').select('*').eq('id', country.id).maybeSingle(),
        supabase
          .from('users')
          .select('flag_url, leader_url, banner_urls')
          .eq('country_id', country.id)
          .maybeSingle(),
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

// ─── IMPOSTOS ───────────────────────────────────────────────
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
        .maybeSingle()

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

  async function saveTaxes(updated: any) {
    setSaving(true)

    if (!country) {
      setSaving(false)
      return { success: false, error: 'País não encontrado' }
    }

    const updateData = {
      income_tax: Number(updated.income_tax) || 0,
      corporate_tax: Number(updated.corporate_tax) || 0,
      property_tax: Number(updated.property_tax) || 0,
      manufacturing_tax: Number(updated.manufacturing_tax) || 0,
      vat: Number(updated.vat) || 0,
      customs: Number(updated.customs) || 0,
    }

    const { error: taxError } = await supabase
      .from('taxes')
      .update(updateData)
      .eq('country_id', country.id)

    if (taxError) {
      console.error('❌ Erro ao atualizar impostos:', taxError)
      setSaving(false)
      return { success: false, error: taxError.message }
    }

    const taxFields = ['income_tax', 'corporate_tax', 'property_tax', 'manufacturing_tax', 'vat', 'customs']
    const totalTax = taxFields.reduce((sum, key) => sum + (Number(updated[key] ?? 0)), 0)
    const avgTax = totalTax / taxFields.length
    const trustPenalty = avgTax > 40 ? (avgTax - 40) * 0.5 : 0
    const approvalPenalty = avgTax > 50 ? (avgTax - 50) * 0.5 : 0

    const { data: currentCountry, error: fetchError } = await supabase
      .from('countries')
      .select('trust, intl_approval')
      .eq('id', country.id)
      .maybeSingle()

    if (!fetchError && currentCountry) {
      const newTrust = Math.max(0, (currentCountry.trust || 50) - trustPenalty)
      const newApproval = Math.max(0, (currentCountry.intl_approval || 50) - approvalPenalty)

      await supabase
        .from('countries')
        .update({ trust: newTrust, intl_approval: newApproval })
        .eq('id', country.id)
    }

    setTaxes((prev: any) => ({ ...prev, ...updateData }))
    setSaving(false)
    return { success: true }
  }

  return { taxes, loading, saving, saveTaxes }
}