'use client'

// hooks/useParliament.ts - V7 FINAL
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

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
  coalition_name?: string
  opposition_name?: string
}

export interface Law {
  id: string
  country_id: number
  law_catalog_id: number
  status: 'active' | 'revoked'
  approved_at: string | null
  revoked_at: string | null
  created_at: string
  forced_approval: boolean
  data: any
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

export function useParliament() {
  const { country } = useAuthStore()
  const [parliament, setParliament] = useState<Parliament | null>(null)
  const [laws, setLaws] = useState<Law[]>([])
  const [catalog, setCatalog] = useState<LawCatalog[]>([])
  const [loading, setLoading] = useState(true)
  
  const [lastLawResult, setLastLawResult] = useState<{
    success: boolean
    message?: string
    error?: string
    requiresForce?: boolean
    forceCost?: { money: number; gold: number; governability: number }
  } | null>(null)

  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

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
      const { data: pData } = await supabase
        .from('parliament')
        .select('*')
        .eq('country_id', country.id)
        .maybeSingle()
      setParliament(pData as Parliament || null)

      const { data: lData } = await supabase
        .from('laws')
        .select(
          `id, country_id, law_catalog_id, status, approved_at, revoked_at, created_at, forced_approval, data,
           law_catalog(id, name, description, political_power_cost, requires_parliament)`
        )
        .eq('country_id', country.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setLaws(lData as Law[] || [])

      const { data: cData } = await supabase
        .from('law_catalog')
        .select('*')
        .order('id')
      setCatalog(cData as LawCatalog[] || [])

      lastLoadedIdRef.current = country.id
    } catch (err) {
      console.error('❌ [useParliament] Erro:', err)
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

  function hasCoalitionMajority(): boolean {
    if (!parliament) return true
    return parliament.coalition_seats > parliament.opposition_seats
  }

  // ✅ Função Centralizada para Calcular o Custo
  function getForceCost(lawCatalogId: number) {
    const law = catalog.find(l => l.id === lawCatalogId)
    const mult = law?.political_power_cost || 1
    return {
      money: mult * 50_000_000,
      gold: mult * 100,
      governability: 5
    }
  }

  async function proposeLaw(
    lawCatalogId: number,
    target?: any
  ): Promise<{ success: boolean; message?: string; error?: string; requiresForce?: boolean; forceCost?: any }> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }

    const law = catalog.find(l => l.id === lawCatalogId)
    if (!law) return { success: false, error: 'Lei não encontrada' }

    // ✅ Validação prévia
    if (lawCatalogId === 2 && !target?.text) return { success: false, error: 'Nome não especificado' }
    if (lawCatalogId === 3 && !target?.text) return { success: false, error: 'Nome da região não especificado' }
    if (lawCatalogId === 4 && !target?.regionId) return { success: false, error: 'Região não especificada' }
    if (lawCatalogId === 8 && (!target?.countryId || !target?.regionId || !target?.enemyRegionId)) return { success: false, error: 'Preencha todos os dados da guerra' }
    if ([9, 10, 12].includes(lawCatalogId) && !target?.countryId) return { success: false, error: 'País alvo não especificado' }
    if (lawCatalogId === 11 && (!target?.warId || !target?.text)) return { success: false, error: 'Selecione a guerra e o lado' }
    if (lawCatalogId === 13 && !target?.text) return { success: false, error: 'Regime não especificado' }
    if (lawCatalogId === 17 && (!target?.taxType || target?.taxValue === undefined)) return { success: false, error: 'Imposto não especificado' }

    const hasMajority = hasCoalitionMajority()

    if (!hasMajority) {
      const forceCost = getForceCost(lawCatalogId)
      const errMsg = `Oposição tem maioria. Você precisa forçar a votação.`
      
      setLastLawResult({
        success: false,
        error: errMsg,
        requiresForce: true,
        forceCost,
      })
      return {
        success: false,
        error: errMsg,
        requiresForce: true,
        forceCost,
      }
    }

    const params = {
      target_country_id: target?.countryId || null,
      target_region_id: target?.regionId || null,
      target_enemy_region_id: target?.enemyRegionId || null,
      target_war_id: target?.warId || null,
      target_text: target?.text || null,
      target_tax_type: target?.taxType || null,
      target_tax_value: target?.taxValue || null,
    }

    const { data: newLaw, error: insertError } = await supabase
      .from('laws')
      .insert({
        country_id: country.id,
        law_catalog_id: lawCatalogId,
        status: 'active',
        approved_at: new Date().toISOString(),
        forced_approval: false,
        data: params,
      })
      .select()
      .single()

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    const result = await executeLawEffect(newLaw.id, params)
    await fetchAll()
    setLastLawResult(result)
    return result
  }

  async function forceLawApproval(
    lawCatalogId: number,
    target?: any,
    bypassCost: boolean = false 
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }

    const law = catalog.find(l => l.id === lawCatalogId)
    if (!law) return { success: false, error: 'Lei não encontrada' }

    const cost = getForceCost(lawCatalogId)
    let ecoData: any = null
    let countryData: any = null

    try {
      // 1. Se não for bypass (não for autoritário), verifica e cobra os custos
      if (!bypassCost) {
        const { data: eco } = await supabase.from('economy').select('money, gold').eq('country_id', country.id).single()
        if (!eco) return { success: false, error: 'Economia não encontrada' }
        ecoData = eco

        if ((ecoData.money || 0) < cost.money) return { success: false, error: `Dinheiro insuficiente. Precisa de R$ ${cost.money.toLocaleString()}` }
        if ((ecoData.gold || 0) < cost.gold) return { success: false, error: `Ouro insuficiente. Precisa de ${cost.gold} Ouro` }

        const { data: cData } = await supabase.from('countries').select('governability').eq('id', country.id).single()
        if (!cData) return { success: false, error: 'País não encontrado' }
        countryData = cData

        // Deduz Dinheiro e Ouro
        await supabase.from('economy').update({ 
          money: (ecoData.money || 0) - cost.money, 
          gold: (ecoData.gold || 0) - cost.gold 
        }).eq('country_id', country.id)
        
        // Deduz Governabilidade (mínimo 0)
        const newGov = Math.max(0, (countryData.governability || 100) - cost.governability)
        await supabase.from('countries').update({ governability: newGov }).eq('id', country.id)
      }

      // 2. Insere a Lei
      const params = {
        target_country_id: target?.countryId || null,
        target_region_id: target?.regionId || null,
        target_enemy_region_id: target?.enemyRegionId || null,
        target_war_id: target?.warId || null,
        target_text: target?.text || null,
        target_tax_type: target?.taxType || null,
        target_tax_value: target?.taxValue || null,
      }

      const { data: newLaw, error: insertError } = await supabase
        .from('laws')
        .insert({
          country_id: country.id,
          law_catalog_id: lawCatalogId,
          status: 'active',
          approved_at: new Date().toISOString(),
          forced_approval: true,
          data: params,
        })
        .select()
        .single()

      if (insertError) {
        // Estorna os custos se a inserção falhar
        if (!bypassCost && ecoData && countryData) {
          await supabase.from('economy').update({ money: ecoData.money, gold: ecoData.gold }).eq('country_id', country.id)
          await supabase.from('countries').update({ governability: countryData.governability }).eq('id', country.id)
        }
        return { success: false, error: insertError.message }
      }

      // 3. Executa efeito da lei
      const result = await executeLawEffect(newLaw.id, params)
      await fetchAll()
      
      return { 
        ...result, 
        message: bypassCost 
          ? `Lei aplicada! \n${result.message || ''}` 
          : `Lei forçada! -R$${cost.money.toLocaleString()}, -${cost.gold} Ouro, -${cost.governability}% Gov.\n${result.message || ''}` 
      }
      
    } catch (err: any) {
      console.error('❌ Erro ao forçar lei:', err)
      return { success: false, error: err.message }
    }
  }

  async function executeLawEffect(
    lawId: string,
    params: any
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }

    let law = laws.find(l => l.id === lawId)
    if (!law) {
      const { data: dbLaw, error: dbError } = await supabase
        .from('laws')
        .select(
          `id, country_id, law_catalog_id, status, approved_at, revoked_at, created_at, forced_approval, data,
           law_catalog(id, name, description, political_power_cost, requires_parliament)`
        )
        .eq('id', lawId)
        .maybeSingle()

      if (dbError || !dbLaw) {
        return { success: false, error: 'Lei não encontrada' }
      }
      law = dbLaw as Law
    }

    let catalogItem = catalog.find(c => c.id === law!.law_catalog_id)
    if (!catalogItem) {
      const { data: dbCat } = await supabase
        .from('law_catalog')
        .select('*')
        .eq('id', law.law_catalog_id)
        .maybeSingle()
      if (!dbCat) return { success: false, error: 'Catálogo não encontrado' }
      catalogItem = dbCat as LawCatalog
    }

    try {
      switch (catalogItem.id) {
        case 1: { // Propor Paz
          if (!params.target_war_id) return { success: false, error: 'Guerra não selecionada' }
          const { error } = await supabase.rpc('propose_peace', { p_country_id: country.id, p_war_id: params.target_war_id })
          if (error) return { success: false, error: error.message }
          return { success: true, message: 'Paz proposta com sucesso!' }
        }

        case 2: { // Alterar Nome
          if (!params.target_text) return { success: false, error: 'Nome não especificado' }
          const oldName = country.name
          await supabase.from('countries').update({ name: params.target_text }).eq('id', country.id)
          const { setCountry } = useAuthStore.getState()
          setCountry({ ...country, name: params.target_text })
          return { success: true, message: `Nome alterado de ${oldName} para ${params.target_text}` }
        }

        case 3: { // Criar Região
          if (!params.target_text) return { success: false, error: 'Nome não especificado' }
          const { data: countryData } = await supabase.from('countries').select('terrain').eq('id', country.id).single()
          await supabase.from('regions').insert({
            country_id: country.id,
            name: params.target_text,
            terrain: countryData?.terrain || 'planicie',
            total_buildings: 0
          })
          return { success: true, message: `Região "${params.target_text}" criada!` }
        }

        case 4: { // Transferir Capital
          if (!params.target_region_id) return { success: false, error: 'Região não selecionada' }
          const { data: region } = await supabase.from('regions').select('name').eq('id', params.target_region_id).eq('country_id', country.id).single()
          if (!region) return { success: false, error: 'Região não é sua' }
          await supabase.from('countries').update({ capital: region.name }).eq('id', country.id)
          return { success: true, message: `Capital transferida para ${region.name}` }
        }

        case 8: { // Declarar Guerra
          if (!params.target_country_id || !params.target_region_id || !params.target_enemy_region_id) {
            return { success: false, error: 'Dados da guerra incompletos' }
          }
          const { data: targetCountry } = await supabase.from('countries').select('name').eq('id', params.target_country_id).single()
          if (!targetCountry) return { success: false, error: 'País alvo não existe' }
          
          const { data: existingWar } = await supabase.from('wars').select('id').or(`and(attacker_id.eq.${country.id},defender_id.eq.${params.target_country_id}),and(attacker_id.eq.${params.target_country_id},defender_id.eq.${country.id})`).eq('status', 'active').maybeSingle()
          if (existingWar) return { success: false, error: 'Já há guerra ativa com este país' }

          const { error: warErr } = await supabase.from('wars').insert({
            attacker_id: country.id,
            defender_id: params.target_country_id,
            status: 'active',
            started_at: new Date().toISOString(),
            terrain: 'flat',
            damage_to_attacker: 0,
            damage_to_defender: 0,
            attacker_region_id: params.target_region_id,
            defender_region_id: params.target_enemy_region_id,
          })
          if (warErr) return { success: false, error: warErr.message }
          return { success: true, message: `Guerra declarada contra ${targetCountry.name}!` }
        }

        case 9: { // Livre Comércio
          if (!params.target_country_id) return { success: false, error: 'País não selecionado' }
          const { error } = await supabase.rpc('propose_trade_agreement', { p_from: country.id, p_to: params.target_country_id })
          if (error) {
            const { error: fallbackErr } = await supabase.rpc('lift_sanctions', { p_from: country.id, p_to: params.target_country_id })
            if (fallbackErr) return { success: false, error: fallbackErr.message }
            return { success: true, message: 'Sanções removidas com sucesso!' }
          }
          return { success: true, message: 'Proposta de Livre Comércio enviada! O outro país precisa aceitar.' }
        }

        case 10: { // Aplicar Sanções
          if (!params.target_country_id) return { success: false, error: 'País não selecionado' }
          const { error } = await supabase.rpc('apply_sanctions', { p_from: country.id, p_to: params.target_country_id })
          if (error) return { success: false, error: error.message }
          return { success: true, message: 'Sanções aplicadas (embargo ativado)!' }
        }

        case 11: { // Participar de Guerra
          if (!params.target_war_id || !params.target_text) return { success: false, error: 'Guerra ou lado não selecionado' }
          const side = params.target_text
          const { data: war, error: warErr } = await supabase.from('wars').select('id, attacker_id, defender_id, status').eq('id', params.target_war_id).maybeSingle()
          if (warErr || !war) return { success: false, error: 'Guerra não encontrada' }
          if (war.attacker_id === country.id || war.defender_id === country.id) return { success: false, error: 'Você já é um dos países principais nesta guerra' }
          
          const { error: partErr } = await supabase.from('war_participants').insert({
            war_id: params.target_war_id,
            country_id: country.id,
            side: side,
            joined_at: new Date().toISOString(),
          })
          if (partErr) return { success: true, message: `Você entrou como aliado do ${side === 'attacker' ? 'atacante' : 'defensor'}!` }
          return { success: true, message: `Você entrou como aliado do ${side === 'attacker' ? 'atacante' : 'defensor'}!` }
        }

        case 12: { // Transferir Região
          if (!params.target_region_id || !params.target_country_id) return { success: false, error: 'Região ou país não selecionado' }
          const { data: region } = await supabase.from('regions').select('name').eq('id', params.target_region_id).eq('country_id', country.id).single()
          if (!region) return { success: false, error: 'Região não é sua' }
          const { data: targetCountry } = await supabase.from('countries').select('name').eq('id', params.target_country_id).single()
          if (!targetCountry) return { success: false, error: 'País destino não existe' }

          await supabase.from('regions').update({ country_id: params.target_country_id }).eq('id', params.target_region_id)
          await supabase.from('buildings').update({ country_id: params.target_country_id }).eq('region_id', params.target_region_id)
          return { success: true, message: `Região "${region.name}" transferida para ${targetCountry.name}!` }
        }

        case 13: { // Alterar Regime
          if (!params.target_text) return { success: false, error: 'Regime não especificado' }
          await supabase.from('countries').update({ state_structure: params.target_text }).eq('id', country.id)
          return { success: true, message: `Regime alterado para ${params.target_text}` }
        }

        case 16: { // Imprimir Dinheiro
          const { data: ecoData } = await supabase.from('economy').select('money').eq('country_id', country.id).single()
          if (!ecoData) return { success: false, error: 'Economia não encontrada' }
          const newMoney = (ecoData.money || 0) + 1_000_000_000
          await supabase.from('economy').update({ money: newMoney }).eq('country_id', country.id)
          return { success: true, message: `+1B adicionados ao tesouro!` }
        }

        case 17: { // Alterar Impostos
          if (!params.target_tax_type || params.target_tax_value === undefined) return { success: false, error: 'Imposto não especificado' }
          const limitTax = Math.min(60, Math.max(1, Number(params.target_tax_value)))
          const updateData: any = { country_id: country.id, [params.target_tax_type]: limitTax }
          const { error: taxError } = await supabase.from('taxes').upsert(updateData, { onConflict: 'country_id' })
          if (taxError) return { success: false, error: taxError.message }
          return { success: true, message: `Imposto alterado para ${limitTax}%` }
        }

        default:
          return { success: false, error: 'Lei sem efeito definido' }
      }
    } catch (err: any) {
      console.error('❌ Erro ao executar lei:', err)
      return { success: false, error: err.message }
    }
  }

  async function runRandomElection(): Promise<{ success: boolean; message?: string }> {
    if (!country?.id || !parliament) return { success: false, message: 'Parlamento não encontrado' }

    const totalSeats = parliament.coalition_seats + parliament.opposition_seats
    const rawSeatsChange = Math.floor(Math.random() * 11) + 10
    const coalitionGains = Math.random() > 0.5

    let newCoalition = parliament.coalition_seats
    let newOpposition = parliament.opposition_seats

    if (coalitionGains) {
      const maxTransfer = Math.min(rawSeatsChange, newOpposition - 1)
      newCoalition += maxTransfer
      newOpposition -= maxTransfer
    } else {
      const maxTransfer = Math.min(rawSeatsChange, newCoalition - 1)
      newOpposition += maxTransfer
      newCoalition -= maxTransfer
    }

    const { error } = await supabase
      .from('parliament')
      .update({
        coalition_seats: newCoalition,
        opposition_seats: newOpposition,
        last_random_at: new Date().toISOString(),
        last_election_at: new Date().toISOString(), 
        election_type: 'random',
      })
      .eq('country_id', country.id)

    if (error) return { success: false, message: `Erro: ${error.message}` }

    await fetchAll()

    const direction = coalitionGains ? 'Coalizão ganhou' : 'Oposição ganhou'
    return {
      success: true,
      message: `${direction} assentos. Novo: ${newCoalition} vs ${newOpposition} (Total: ${totalSeats})`,
    }
  }

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
    forceLawApproval,
    runRandomElection,
    hasCoalitionMajority,
    lastLawResult,
    refetch,
    getForceCost, // ✅ Exportado para a tela usar
  }
}