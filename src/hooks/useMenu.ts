// ============================================================
// useMenu.ts - CORRIGIDO E COMPLETO
// ============================================================

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

// ─── HOOK: ECONOMIA (Calcula Orçamento e Armazém) ─────────────
export function useEconomy() {
  const { country } = useAuthStore()
  const [economy, setEconomy] = useState<any>(null)
  const [military, setMilitary] = useState<any>(null)
  const [buildings, setBuildings] = useState<any[]>([])
  const [taxes, setTaxes] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

  const fetchData = useCallback(async () => {
    if (!country?.id) {
      setEconomy(null)
      setMilitary(null)
      setBuildings([])
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
      // ✅ Puxa tudo que precisamos para calcular o orçamento
      const [e, m, b, t] = await Promise.all([
        supabase.from('economy').select('*').eq('country_id', country.id).maybeSingle(),
        supabase.from('military').select('*').eq('country_id', country.id).maybeSingle(),
        supabase.from('buildings').select('*, building_catalog(maint_money, produces)').eq('country_id', country.id),
        supabase.from('taxes').select('*').eq('country_id', country.id).maybeSingle(),
      ])

      setEconomy(e.data)
      setMilitary(m.data)
      setBuildings(b.data ?? [])
      setTaxes(t.data)
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
      setTaxes(null)
      setLoading(false)
    }
  }, [country?.id, fetchData])

  // ✅ CÁLCULO DO ORÇAMENTO (Lógica de Lucro vs Despesa)
  let totalIncome = 0
  let totalExpenses = 0
  const resourceProduction: Record<string, number> = {}

  if (taxes) {
    // Regra: Cada 1% de imposto = 100 Milhões de lucro. A soma dos 3 impostos é a renda bruta.
    const taxSum = (taxes.income_tax || 0) + (taxes.property_tax || 0) + (taxes.manufacturing_tax || 0)
    totalIncome = taxSum * 100_000_000
  }

  if (buildings && buildings.length > 0) {
    buildings.forEach(b => {
      const cat = b.building_catalog
      if (!cat) return
      
      const qty = b.quantity || 1
      
      // Despesas com manutenção de prédios
      totalExpenses += (Number(cat.maint_money) || 0) * qty

      // Produção de recursos (Ex: 300 por prédio)
      if (cat.produces) {
        resourceProduction[cat.produces] = (resourceProduction[cat.produces] || 0) + (300 * qty)
      }
    })
  }

  // Adicione manutenção militar aqui se você tiver o custo (ex: cada soldado custa 10)
  if (military) {
    // Exemplo: totalExpenses += (military.soldiers || 0) * 10
  }

  const budget = {
    income: totalIncome,
    expenses: totalExpenses,
    netBalance: totalIncome - totalExpenses,
    resourceProduction
  }

  return { economy, military, buildings, taxes, budget, loading, refetch: fetchData }
}

// ─── BRIEFING (Notificações e Propostas) ──
export function useBriefing() {
  const { country } = useAuthStore()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

  const fetchInitial = useCallback(async () => {
    if (!country?.id) {
      setNotifications([])
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === country.id) {
      return
    }

    fetchingRef.current = true
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('country_id', country.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setNotifications(data ?? [])
      lastLoadedIdRef.current = country.id
    } catch (err) {
      console.error('❌ [useBriefing] Erro crítico:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [country?.id])

  useEffect(() => {
    if (!country?.id) {
      setNotifications([])
      setLoading(false)
      return
    }

    if (lastLoadedIdRef.current !== country.id) {
      fetchInitial()
    }

    const channel = supabase
      .channel(`notifications_${country.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.new.country_id === country.id) {
          setNotifications(prev => [payload.new, ...prev])
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.new.country_id === country.id) {
          setNotifications(prev => prev.map(n => (n.id === payload.new.id ? payload.new : n)))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [country?.id, fetchInitial])

  const markRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }, [])

  const markAllRead = useCallback(async () => {
    if (!country?.id) return
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    await supabase.from('notifications').update({ is_read: true }).eq('country_id', country.id).eq('is_read', false)
  }, [country?.id])

  const handleProposalAction = useCallback(async (notificationId: string, action: 'accept' | 'reject') => {
    try {
      const { data, error } = await supabase.rpc('process_diplomacy_proposal', {
        p_notification_id: notificationId,
        p_action: action
      })

      if (error) throw error

      setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n)))
      return data as { success: boolean; message?: string; error?: string }
    } catch (err: any) {
      console.error('❌ [useBriefing] Erro ao processar proposta:', err)
      return { success: false, error: err.message }
    }
  }, [])

  return {
    notifications,
    loading,
    markRead,
    markAllRead,
    refetch: fetchInitial,
    handleProposalAction,
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
        supabase.from('market').select('*, countries(name, flag_emoji)').in('status', ['open', 'partial']).order('created_at', { ascending: false }).limit(50),
        supabase.from('market').select('*').eq('country_id', country.id).in('status', ['open', 'partial']).order('created_at', { ascending: false }),
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
    if (!country?.id) return
    if (lastLoadedIdRef.current !== country.id) fetchAll()

    const channel = supabase
      .channel('market_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'market' }, (payload) => {
        if (payload.new.status === 'open' || payload.new.status === 'partial') {
          setOffers(prev => [payload.new, ...prev].slice(0, 50))
          if (payload.new.country_id === country.id) setMyOffers(prev => [payload.new, ...prev])
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'market' }, (payload) => {
        setOffers(prev => {
          const exists = prev.some(o => o.id === payload.new.id)
          if (!exists && (payload.new.status === 'open' || payload.new.status === 'partial')) return [payload.new, ...prev].slice(0, 50)
          return prev.map(o => (o.id === payload.new.id ? payload.new : o)).filter(o => o.status === 'open' || o.status === 'partial')
        })
        setMyOffers(prev => {
          if (payload.new.country_id !== country.id) return prev
          const exists = prev.some(o => o.id === payload.new.id)
          if (!exists && (payload.new.status === 'open' || payload.new.status === 'partial')) return [payload.new, ...prev]
          return prev.map(o => (o.id === payload.new.id ? payload.new : o)).filter(o => o.status === 'open' || o.status === 'partial')
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
    const { data } = await supabase.rpc('place_market_order', { p_country_id: country.id, p_resource: resource, p_order_type: type, p_quantity: qty, p_price: price })
    await fetchAll()
    return data
  }

  async function buyOffer(orderId: string, qty: number) {
    if (!country?.id) return
    const { data } = await supabase.rpc('execute_market_transaction', { p_order_id: orderId, p_buyer_id: country.id, p_quantity: qty })
    await fetchAll()
    return data
  }

  async function cancelOrder(orderId: string) {
    if (!country?.id) return { success: false, error: 'País não encontrado' }
    try {
      const { error } = await supabase.from('market').update({ status: 'closed' }).eq('id', orderId).eq('country_id', country.id)
      if (error) throw error
      await fetchAll()
      return { success: true, message: 'Oferta cancelada' }
    } catch (err: any) {
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
    if (!country?.id) return setLoading(false)
    if (fetchingRef.current || lastLoadedIdRef.current === country.id) return

    fetchingRef.current = true
    setLoading(true)

    try {
      const [c, u] = await Promise.all([
        supabase.from('countries').select('*').eq('id', country.id).maybeSingle(),
        supabase.from('users').select('flag_url, leader_url, banner_urls').eq('country_id', country.id).maybeSingle(),
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
    if (country?.id && lastLoadedIdRef.current !== country.id) fetchData()
    else if (!country?.id) { setData(null); setProfile(null); setLoading(false) }
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
    if (!country?.id) return setLoading(false)
    if (fetchingRef.current || lastLoadedIdRef.current === country.id) return

    fetchingRef.current = true
    setLoading(true)

    try {
      const { data } = await supabase.from('taxes').select('*').eq('country_id', country.id).maybeSingle()
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
    if (country?.id && lastLoadedIdRef.current !== country.id) fetchTaxes()
    else if (!country?.id) { setTaxes(null); setLoading(false) }
  }, [country?.id, fetchTaxes])

  async function saveTaxes(updated: any) {
    setSaving(true)
    if (!country) return { success: false, error: 'País não encontrado' }

    // ✅ TRAVA DE SEGURANÇA: Mínimo 1%, Máximo 60%
    const limitTax = (val: any) => Math.min(60, Math.max(1, Number(val) || 1))

    const updateData = {
      income_tax: limitTax(updated.income_tax),
      property_tax: limitTax(updated.property_tax),
      manufacturing_tax: limitTax(updated.manufacturing_tax),
    }

    // O banco vai atualizar (lembre-se de ter rodado o SQL que adiciona a coluna updated_at)
    const { error: taxError } = await supabase
      .from('taxes')
      .update(updateData)
      .eq('country_id', country.id)

    if (taxError) {
      console.error('❌ Erro ao atualizar impostos:', taxError)
      setSaving(false)
      return { success: false, error: taxError.message }
    }

    // Cálculo de penalidade na confiança
    const totalTax = updateData.income_tax + updateData.property_tax + updateData.manufacturing_tax
    const avgTax = totalTax / 3
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