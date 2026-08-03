// hooks/useParliament.ts
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'


// ─── TIPOS ──────────────────────────────────────────────


export interface Parliament {
  id: string
  country_id: number
  coalition_seats: number
  opposition_seats: number
  total_seats: number
  last_election_at: string
  last_random_at: string
  election_type: 'trust' | 'random'
  updated_at: string
}


export interface Law {
  id: string
  country_id: number
  law_catalog_id: number
  votes_for: number
  votes_against: number
  status: 'pending' | 'active' | 'revoked'
  approved_at: string | null
  revoked_at: string | null
  created_at: string
  forced_approval: boolean
  data: any // JSONB com parâmetros
  law_catalog: {
    id: number
    name: string
    description: string
    political_power_cost: number
    requires_parliament: boolean
  } | null
}


export interface LawCatalog {
  id: number
  name: string
  description: string
  requires_parliament: boolean
  political_power_cost: number
}


// ─── HOOK ──────────────────────────────────────────────


export function useParliament() {
  const { country } = useAuthStore()
  const [parliament, setParliament] = useState<Parliament | null>(null)
  const [laws, setLaws] = useState<Law[]>([])
  const [catalog, setCatalog] = useState<LawCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [countdowns, setCountdowns] = useState<Record<string, number>>({})


  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)


  // ─── BUSCAR DADOS ──────────────────────────────────────


  const fetchAll = useCallback(async () => {
    if (!country?.id) {
      setParliament(null)
      setLaws([])
      setCatalog([])
      setLoading(false)
      return
    }


    if (fetchingRef.current || lastLoadedIdRef.current === country.id) {
      return
    }


    fetchingRef.current = true
    setLoading(true)


    try {
      // 1. Parlamento
      const { data: pData, error: pError } = await supabase
        .from('parliament')
        .select('id, country_id, coalition_seats, opposition_seats, total_seats, last_election_at, last_random_at, election_type, updated_at')
        .eq('country_id', country.id)
        .maybeSingle()


      if (pError) throw pError
      setParliament(pData as Parliament || null)


      // 2. Leis
      const { data: lData, error: lError } = await supabase
        .from('laws')
        .select(`
          id, country_id, law_catalog_id, votes_for, votes_against,
          status, approved_at, revoked_at, created_at, forced_approval, data,
          law_catalog(id, name, description, political_power_cost, requires_parliament)
        `)
        .eq('country_id', country.id)
        .order('created_at', { ascending: false })
        .limit(30)


      if (lError) throw lError
      setLaws(lData as Law[] || [])


      // 3. Catálogo
      const { data: cData, error: cError } = await supabase
        .from('law_catalog')
        .select('id, name, description, requires_parliament, political_power_cost')
        .order('id')


      if (cError) throw cError
      setCatalog(cData as LawCatalog[] || [])


      lastLoadedIdRef.current = country.id
    } catch (err) {
      console.error('❌ [useParliament] Erro ao buscar dados:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [country?.id])


  useEffect(() => {
    if (country?.id && lastLoadedIdRef.current !== country.id) {
      fetchAll()
    } else if (!country?.id) {
      setParliament(null)
      setLaws([])
      setCatalog([])
      setLoading(false)
    }
  }, [country?.id, fetchAll])


  // ─── TIMER PARA CONTAGEM REGRESSIVA (5 minutos) ──────


  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const updated: Record<string, number> = {}
      laws.forEach(law => {
        if (law.status === 'pending' && law.created_at) {
          const deadline = new Date(new Date(law.created_at).getTime() + 5 * 60 * 1000).getTime()
          const remaining = Math.max(0, deadline - now)
          updated[law.id] = remaining
        }
      })
      setCountdowns(updated)
    }, 1000)
    return () => clearInterval(interval)
  }, [laws])


  // ─── FUNÇÕES DE TEMPO (ELEIÇÕES) ──────────────────────


  function nextElectionIn(): string {
    if (!parliament) return '—'
    const last = new Date(parliament.last_election_at).getTime()
    const next = last + (12 * 60 * 60 * 1000)
    const diff = Math.max(0, next - Date.now())
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}m`
  }


  function nextRandomIn(): string {
    if (!parliament) return '—'
    const last = new Date(parliament.last_random_at).getTime()
    const next = last + (48 * 60 * 60 * 1000)
    const diff = Math.max(0, next - Date.now())
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}m`
  }


  function getCountdown(lawId: string): string {
    const ms = countdowns[lawId]
    if (ms === undefined) return '—'
    if (ms <= 0) return 'Votação encerrada'
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${m}:${s.toString().padStart(2, '0')}`
  }


  // ─── PROPOR LEI ──────────────────────────────────────────


  async function proposeLaw(
    lawCatalogId: number,
    target?: {
      countryId?: number
      regionId?: string
      text?: string
      taxType?: string
      taxValue?: number
    }
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }


    const law = catalog.find(l => l.id === lawCatalogId)
    if (!law) return { success: false, error: 'Lei não encontrada no catálogo' }


    // Verifica poder político
    const { data: ppData, error: ppError } = await supabase
      .from('countries')
      .select('political_power')
      .eq('id', country.id)
      .single()


    if (ppError) return { success: false, error: 'Erro ao verificar poder político' }
    if (ppData.political_power < law.political_power_cost) {
      return { success: false, error: `Poder político insuficiente (precisa de ${law.political_power_cost}, tem ${ppData.political_power})` }
    }


    // Desconta o poder político
    await supabase
      .from('countries')
      .update({ political_power: ppData.political_power - law.political_power_cost })
      .eq('id', country.id)


    // Se a lei não requer parlamento, ação direta
    if (!law.requires_parliament) {
      return await executeDirectAction(lawCatalogId, target)
    }


    // BUSCA OS ASSENTOS ATUAIS DO PARLAMENTO
    let coalition_seats = 50
    let opposition_seats = 50
    if (parliament) {
      coalition_seats = parliament.coalition_seats
      opposition_seats = parliament.opposition_seats
    } else {
      // Se não houver parlamento, busca do banco
      const { data: pData } = await supabase
        .from('parliament')
        .select('coalition_seats, opposition_seats')
        .eq('country_id', country.id)
        .maybeSingle()
      if (pData) {
        coalition_seats = pData.coalition_seats
        opposition_seats = pData.opposition_seats
      }
    }


    // Monta o objeto de parâmetros para salvar em 'data'
    const params = {
      target_country_id: target?.countryId || null,
      target_region_id: target?.regionId ? Number(target.regionId) : null,
      target_text: target?.text || null,
      target_tax_type: target?.taxType || null,
      target_tax_value: target?.taxValue || null,
      target_type: target?.countryId ? 'country' : target?.regionId ? 'region' : target?.text ? 'text' : null,
    }


    // Insere a lei com os votos da coalizão (a favor) e oposição (contra)
    const { data: newLaw, error: insertError } = await supabase
      .from('laws')
      .insert({
        country_id: country.id,
        law_catalog_id: lawCatalogId,
        status: 'pending',
        votes_for: coalition_seats,
        votes_against: opposition_seats,
        created_at: new Date().toISOString(),
        forced_approval: false,
        data: params,
      })
      .select()
      .single()


    if (insertError) {
      console.error('❌ Erro ao inserir lei:', insertError)
      // Reverte o poder político em caso de erro
      await supabase
        .from('countries')
        .update({ political_power: ppData.political_power })
        .eq('id', country.id)
      return { success: false, error: insertError.message }
    }


    // Agenda a finalização da votação (5 minutos)
    setTimeout(async () => {
      await finalizeVoting(newLaw.id)
    }, 5 * 60 * 1000) // 5 minutos


    await fetchAll()
    return { success: true, message: 'Lei proposta com sucesso!' }
  }


  // ─── FINALIZAR VOTAÇÃO ──────────────────────────────────


  async function finalizeVoting(lawId: string) {
    const { data: law, error } = await supabase
      .from('laws')
      .select('*')
      .eq('id', lawId)
      .single()


    if (error || !law || law.status !== 'pending') return


    const approved = law.votes_for > law.votes_against
    const newStatus = approved ? 'active' : 'revoked'
    const updateData: any = { status: newStatus }
    if (approved) {
      updateData.approved_at = new Date().toISOString()
    } else {
      updateData.revoked_at = new Date().toISOString()
    }


    await supabase
      .from('laws')
      .update(updateData)
      .eq('id', lawId)


    // Se aprovada, executa o efeito
    if (approved) {
      await executeLawEffect(lawId)
    }


    // Recarrega dados
    await fetchAll()
  }


  // ─── AÇÕES DIRETAS ─────────────────────────────────────


  async function executeDirectAction(
    lawCatalogId: number,
    target?: {
      countryId?: number
      regionId?: string
      text?: string
      taxType?: string
      taxValue?: number
    }
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }


    try {
      // Propor Paz (ID 1)
      if (lawCatalogId === 1) {
        if (!target?.countryId) return { success: false, error: 'Selecione um país para propor paz' }
        const { data: fromCountry } = await supabase
          .from('countries')
          .select('name')
          .eq('id', country.id)
          .single()
        await supabase.rpc('notify_country', {
          p_country_id: target.countryId,
          p_message: `${fromCountry?.name || 'Um país'} propôs um acordo de paz. Aceitar?`,
          p_title: 'Proposta de Paz',
          p_type: 'peace_offer',
        })
        return { success: true, message: '✅ Proposta de paz enviada!' }
      }


      // Livre Comercio e Circulação (ID 9)
      if (lawCatalogId === 9) {
        if (!target?.countryId) return { success: false, error: 'Selecione um país para revogar sanções' }
        await supabase.rpc('lift_sanctions', { p_from: country.id, p_to: target.countryId })
        const { data: fromCountry } = await supabase
          .from('countries')
          .select('name')
          .eq('id', country.id)
          .single()
        await supabase.rpc('notify_country', {
          p_country_id: target.countryId,
          p_message: `${fromCountry?.name || 'Um país'} propôs livre comércio e circulação. Aceitar?`,
          p_title: 'Livre Comércio',
          p_type: 'trade_offer',
        })
        return { success: true, message: '✅ Proposta de livre comércio enviada!' }
      }


      // Aplicar Sanções (ID 10)
      if (lawCatalogId === 10) {
        if (!target?.countryId) return { success: false, error: 'Selecione um país para aplicar sanções' }
        await supabase.rpc('apply_sanctions', { p_from: country.id, p_to: target.countryId })
        const { data: fromCountry } = await supabase
          .from('countries')
          .select('name')
          .eq('id', country.id)
          .single()
        await supabase.rpc('notify_country', {
          p_country_id: target.countryId,
          p_message: `${fromCountry?.name || 'Um país'} aplicou sanções contra seu país.`,
          p_title: 'Sanções Aplicadas',
          p_type: 'sanctions',
        })
        return { success: true, message: '✅ Sanções aplicadas!' }
      }


      return { success: false, error: 'Ação direta não implementada para esta lei' }
    } catch (err: any) {
      console.error('❌ Erro na ação direta:', err)
      return { success: false, error: err.message }
    }
  }


  // ─── EXECUTAR EFEITO DA LEI ────────────────────────────


  async function executeLawEffect(lawId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }


    const law = laws.find(l => l.id === lawId)
    if (!law) return { success: false, error: 'Lei não encontrada' }


    const catalogItem = catalog.find(c => c.id === law.law_catalog_id)
    if (!catalogItem) return { success: false, error: 'Catálogo não encontrado' }


    const params = law.data || {}


    try {
      switch (catalogItem.id) {
        case 2: // Alterar Nome de Estado
          if (!params.target_text) return { success: false, error: 'Nome não especificado' }
          await supabase
            .from('countries')
            .update({ name: params.target_text })
            .eq('id', country.id)
          return { success: true, message: `Nome alterado para ${params.target_text}` }


        case 3: // Criar Nova Região
          if (!params.target_text) return { success: false, error: 'Nome da região não especificado' }
          const { data: terrainData } = await supabase
            .from('countries')
            .select('terrain')
            .eq('id', country.id)
            .single()
          await supabase
            .from('regions')
            .insert({
              country_id: country.id,
              name: params.target_text,
              terrain: terrainData?.terrain || 'planicie',
              area_km2: 300000,
              used_area: 0,
            })
          return { success: true, message: `Região ${params.target_text} criada!` }


        case 4: // Transferir Capital
          if (!params.target_region_id) return { success: false, error: 'Região não selecionada' }
          const { data: region } = await supabase
            .from('regions')
            .select('name')
            .eq('id', params.target_region_id)
            .single()
          if (!region) return { success: false, error: 'Região não encontrada' }
          await supabase
            .from('countries')
            .update({ capital: region.name })
            .eq('id', country.id)
          return { success: true, message: `Capital alterada para ${region.name}` }


        case 8: // Declarar Guerra
          if (!params.target_country_id) return { success: false, error: 'País alvo não especificado' }
          await supabase
            .from('wars')
            .insert({
              attacker_id: country.id,
              defender_id: params.target_country_id,
              status: 'active',
              started_at: new Date().toISOString(),
              damage_to_attacker: 0,
              damage_to_defender: 0,
            })
          return { success: true, message: 'Guerra declarada!' }


        case 11: // Participar de Guerra
          if (!params.target_country_id) return { success: false, error: 'Guerra não selecionada' }
          // Aqui você precisa definir como será a participação.
          // Exemplo: atualizar o defender_id da guerra (apenas um exemplo)
          await supabase
            .from('wars')
            .update({ defender_id: country.id })
            .eq('id', params.target_country_id)
          return { success: true, message: 'Participação confirmada!' }


        case 12: // Transferência de Região
          if (!params.target_region_id || !params.target_country_id) {
            return { success: false, error: 'Região ou país destino não selecionado' }
          }
          await supabase
            .from('regions')
            .update({ country_id: params.target_country_id })
            .eq('id', params.target_region_id)
          return { success: true, message: 'Região transferida!' }


        case 13: // Alterar Regime
          if (!params.target_text) return { success: false, error: 'Regime não especificado' }
          await supabase
            .from('countries')
            .update({ state_structure: params.target_text })
            .eq('id', country.id)
          return { success: true, message: `Regime alterado para ${params.target_text}` }


        case 16: // Imprimir Dinheiro
          await supabase.rpc('imprimir_dinheiro') // crie esta função no banco ou faça update manual
          return { success: true, message: 'Dinheiro impresso!' }


        case 17: // Alterar impostos
          if (!params.target_tax_type || params.target_tax_value === undefined) {
            return { success: false, error: 'Tipo e valor do imposto não especificados' }
          }
          const updateData: any = {}
          updateData[params.target_tax_type] = params.target_tax_value
          await supabase
            .from('taxes')
            .update(updateData)
            .eq('country_id', country.id)
          return { success: true, message: 'Impostos alterados!' }


        default:
          return { success: false, error: 'Lei sem efeito definido' }
      }
    } catch (err: any) {
      console.error('❌ Erro ao executar efeito da lei:', err)
      return { success: false, error: err.message }
    }
  }


  // ─── FORÇAR LEI ──────────────────────────────────────────


  async function forceLaw(lawId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }


    const law = laws.find(l => l.id === lawId)
    if (!law) return { success: false, error: 'Lei não encontrada' }


    const catalogItem = catalog.find(c => c.id === law.law_catalog_id)
    if (!catalogItem) return { success: false, error: 'Catálogo não encontrado' }


    const cost = catalogItem.political_power_cost


    const { data: ppData, error: ppError } = await supabase
      .from('countries')
      .select('political_power')
      .eq('id', country.id)
      .single()


    if (ppError) return { success: false, error: 'Erro ao verificar poder político' }
    if (ppData.political_power < cost) {
      return { success: false, error: `Poder insuficiente (precisa de ${cost}, tem ${ppData.political_power})` }
    }


    // Desconta poder
    await supabase
      .from('countries')
      .update({ political_power: ppData.political_power - cost })
      .eq('id', country.id)


    // Aprova a lei
    await supabase
      .from('laws')
      .update({ status: 'active', approved_at: new Date().toISOString(), forced_approval: true })
      .eq('id', lawId)


    // Executa o efeito
    await executeLawEffect(lawId)


    await fetchAll()
    return { success: true, message: 'Lei aprovada por força política!' }
  }


  // ─── REFETCH ────────────────────────────────────────────


  const refetch = useCallback(() => {
    lastLoadedIdRef.current = null
    fetchAll()
  }, [fetchAll])


  return {
    parliament,
    laws,
    catalog,
    loading,
    proposeLaw,
    forceLaw,
    nextElectionIn,
    nextRandomIn,
    getCountdown,
    refetch,
  }
}
