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

// ─── HOOK ──────────────────────────────────────────────
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
    forceCost?: number
  } | null>(null)

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
        .select('*')
        .eq('country_id', country.id)
        .maybeSingle()

      if (pError) throw pError
      setParliament(pData as Parliament || null)

      // 2. Leis
      const { data: lData, error: lError } = await supabase
        .from('laws')
        .select(
          `
        id, country_id, law_catalog_id, status, approved_at, revoked_at,
        created_at, forced_approval, data,
        law_catalog(id, name, description, political_power_cost, requires_parliament)
      `
        )
        .eq('country_id', country.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (lError) throw lError
      setLaws(lData as Law[] || [])

      // 3. Catálogo
      const { data: cData, error: cError } = await supabase
        .from('law_catalog')
        .select('*')
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

  // ─── FUNÇÃO AUXILIAR: Checa maioria no parlamento ──────
  function hasCoalitionMajority(): boolean {
    if (!parliament) return true // Se não houver parlamento, assume que tem maioria
    return parliament.coalition_seats > parliament.opposition_seats
  }

  // ─── PROPOR LEI ────────────────────────────────────────
  async function proposeLaw(
    lawCatalogId: number,
    target?: {
      countryId?: number
      regionId?: string
      text?: string
      taxType?: string
      taxValue?: number
    }
  ): Promise<{ success: boolean; message?: string; error?: string; requiresForce?: boolean; forceCost?: number }> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }

    const law = catalog.find(l => l.id === lawCatalogId)
    if (!law) return { success: false, error: 'Lei não encontrada no catálogo' }

    // 🔍 Verifica se tem maioria no parlamento
    const hasMajority = hasCoalitionMajority()

    if (!hasMajority) {
      // ❌ Sem maioria - precisa forçar
      const forceCost = law.political_power_cost

      setLastLawResult({
        success: false,
        error: `Oposição tem maioria no parlamento. Não é possível aprovar sem forçar.`,
        requiresForce: true,
        forceCost: forceCost,
      })

      return {
        success: false,
        error: `Oposição tem maioria. Custa ${forceCost} PP para forçar aprovação.`,
        requiresForce: true,
        forceCost: forceCost,
      }
    }

    // ✅ Tem maioria - executa direto (sem custo PP)
    // Monta parâmetros
    const params = {
      target_country_id: target?.countryId || null,
      target_region_id: target?.regionId || null,
      target_text: target?.text || null,
      target_tax_type: target?.taxType || null,
      target_tax_value: target?.taxValue || null,
    }

    // Insere lei como 'active' (aprovada imediatamente)
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
      console.error('❌ Erro ao inserir lei:', insertError)
      return { success: false, error: insertError.message }
    }

    // EXECUTA O EFEITO DA LEI
    const result = await executeLawEffect(newLaw.id, params)

    // Recarrega dados
    await fetchAll()

    setLastLawResult(result)
    return result
  }

  // ─── FORÇAR APROVAÇÃO (com custo PP) ───────────────────
  async function forceLawApproval(
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

    const forceCost = law.political_power_cost

    // Verifica poder político
    const { data: ppData, error: ppError } = await supabase
      .from('countries')
      .select('political_power')
      .eq('id', country.id)
      .single()

    if (ppError)
      return { success: false, error: 'Erro ao verificar poder político' }
    if (ppData.political_power < forceCost) {
      return {
        success: false,
        error: `Poder político insuficiente (precisa de ${forceCost}, tem ${ppData.political_power})`,
      }
    }

    // Desconta o poder político
    await supabase
      .from('countries')
      .update({
        political_power: ppData.political_power - forceCost,
      })
      .eq('id', country.id)

    // Monta parâmetros
    const params = {
      target_country_id: target?.countryId || null,
      target_region_id: target?.regionId || null,
      target_text: target?.text || null,
      target_tax_type: target?.taxType || null,
      target_tax_value: target?.taxValue || null,
    }

    // Insere lei como 'active' com forced_approval=true
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
      console.error('❌ Erro ao inserir lei:', insertError)
      // Reverte o poder político em caso de erro
      await supabase
        .from('countries')
        .update({ political_power: ppData.political_power })
        .eq('id', country.id)
      return { success: false, error: insertError.message }
    }

    // EXECUTA O EFEITO DA LEI
    const result = await executeLawEffect(newLaw.id, params)

    // Recarrega dados
    await fetchAll()

    const message = `Lei forçada com sucesso! (Custo: ${forceCost} PP)\n${result.message || ''}`
    setLastLawResult({ ...result, message })

    return { ...result, message }
  }

  // ─── EXECUTAR EFEITO DA LEI ────────────────────────────
  async function executeLawEffect(
    lawId: string,
    params: any
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!country?.id) return { success: false, error: 'País não encontrado' }

    const law = laws.find(l => l.id === lawId)
    if (!law) return { success: false, error: 'Lei não encontrada' }

    const catalogItem = catalog.find(c => c.id === law.law_catalog_id)
    if (!catalogItem)
      return { success: false, error: 'Catálogo não encontrado' }

    try {
      switch (catalogItem.id) {
        // 2. Alterar Nome de Estado
        case 2: {
          if (!params.target_text)
            return { success: false, error: 'Nome não especificado' }

          const oldName = country.name
          await supabase
            .from('countries')
            .update({ name: params.target_text })
            .eq('id', country.id)

          // Atualiza estado da loja
          const { setCountry } = useAuthStore.getState()
          setCountry({ ...country, name: params.target_text })

          return {
            success: true,
            message: `Nome alterado de ${oldName} para ${params.target_text}`,
          }
        }

        // 3. Criar Nova Região
        case 3: {
          if (!params.target_text)
            return { success: false, error: 'Nome da região não especificado' }

          const { data: countryData } = await supabase
            .from('countries')
            .select('terrain')
            .eq('id', country.id)
            .single()

          await supabase.from('regions').insert({
            country_id: country.id,
            name: params.target_text,
            terrain: countryData?.terrain || 'planicie',
            area_km2: 300000,
            is_coastal: false,
            used_area: 0,
          })

          return {
            success: true,
            message: `Região "${params.target_text}" criada com sucesso!`,
          }
        }

        // 4. Transferir Capital
        case 4: {
          if (!params.target_region_id)
            return { success: false, error: 'Região não selecionada' }

          const { data: region } = await supabase
            .from('regions')
            .select('name')
            .eq('id', params.target_region_id)
            .eq('country_id', country.id)
            .single()

          if (!region)
            return { success: false, error: 'Região não encontrada ou não é sua' }

          await supabase
            .from('countries')
            .update({ capital: region.name })
            .eq('id', country.id)

          return {
            success: true,
            message: `Capital transferida para ${region.name}`,
          }
        }

        // 8. Declarar Guerra
        case 8: {
          if (!params.target_country_id)
            return { success: false, error: 'País alvo não especificado' }

          // Verifica se o país alvo existe
          const { data: targetCountry } = await supabase
            .from('countries')
            .select('name')
            .eq('id', params.target_country_id)
            .single()

          if (!targetCountry)
            return { success: false, error: 'País alvo não existe' }

          // Verifica se já há guerra ativa entre os dois
          const { data: existingWar } = await supabase
            .from('wars')
            .select('id')
            .or(
              `and(attacker_id.eq.${country.id},defender_id.eq.${params.target_country_id}),and(attacker_id.eq.${params.target_country_id},defender_id.eq.${country.id})`
            )
            .eq('status', 'active')
            .maybeSingle()

          if (existingWar)
            return {
              success: false,
              error: `Já existe uma guerra ativa com ${targetCountry.name}`,
            }

          // Cria a guerra
          await supabase.from('wars').insert({
            attacker_id: country.id,
            defender_id: params.target_country_id,
            status: 'active',
            started_at: new Date().toISOString(),
            terrain: 'flat',
            damage_to_attacker: 0,
            damage_to_defender: 0,
          })

          return {
            success: true,
            message: `Guerra declarada contra ${targetCountry.name}!`,
          }
        }

        // 9. Livre Comércio e Circulação (Remover Sanções)
        case 9: {
          if (!params.target_country_id)
            return { success: false, error: 'País não selecionado' }

          // Remove sanções que EU apliquei contra esse país
          const { error: removeError } = await supabase.rpc('lift_sanctions', {
            p_from: country.id,
            p_to: params.target_country_id,
          })

          if (removeError)
            return {
              success: false,
              error: `Erro ao remover sanções: ${removeError.message}`,
            }

          return {
            success: true,
            message: 'Sanções removidas e comércio livre estabelecido!',
          }
        }

        // 10. Aplicar Sanções
        case 10: {
          if (!params.target_country_id)
            return { success: false, error: 'País alvo não selecionado' }

          const { error: sanctionError } = await supabase.rpc(
            'apply_sanctions',
            {
              p_from: country.id,
              p_to: params.target_country_id,
            }
          )

          if (sanctionError)
            return {
              success: false,
              error: `Erro ao aplicar sanções: ${sanctionError.message}`,
            }

          return {
            success: true,
            message: 'Sanções aplicadas com sucesso!',
          }
        }

        // 12. Transferência de Região
        case 12: {
          if (!params.target_region_id || !params.target_country_id) {
            return {
              success: false,
              error: 'Região ou país destino não selecionado',
            }
          }

          // Verifica se é realmente região minha
          const { data: region } = await supabase
            .from('regions')
            .select('name')
            .eq('id', params.target_region_id)
            .eq('country_id', country.id)
            .single()

          if (!region)
            return { success: false, error: 'Região não é sua' }

          // Verifica se país destino existe
          const { data: targetCountry } = await supabase
            .from('countries')
            .select('name')
            .eq('id', params.target_country_id)
            .single()

          if (!targetCountry)
            return { success: false, error: 'País destino não existe' }

          // Transfere a região
          await supabase
            .from('regions')
            .update({ country_id: params.target_country_id })
            .eq('id', params.target_region_id)

          return {
            success: true,
            message: `Região "${region.name}" transferida para ${targetCountry.name}`,
          }
        }

        // 13. Alterar Regime
        case 13: {
          if (!params.target_text)
            return { success: false, error: 'Regime não especificado' }

          await supabase
            .from('countries')
            .update({ state_structure: params.target_text })
            .eq('id', country.id)

          return {
            success: true,
            message: `Regime alterado para ${params.target_text}`,
          }
        }

        // 16. Imprimir Dinheiro
        case 16: {
          const { data: ecoData } = await supabase
            .from('economy')
            .select('money, inflation')
            .eq('country_id', country.id)
            .single()

          if (!ecoData)
            return { success: false, error: 'Economia não encontrada' }

          const newMoney = ecoData.money + 1_000_000_000 // +1B
          const newInflation = ecoData.inflation + 1 // +1%

          await supabase
            .from('economy')
            .update({
              money: newMoney,
              inflation: newInflation,
            })
            .eq('country_id', country.id)

          return {
            success: true,
            message: `Dinheiro impresso! +1B adicionados (Inflação: +1%)`,
          }
        }

        // 17. Alterar Impostos
        case 17: {
          if (!params.target_tax_type || params.target_tax_value === undefined) {
            return {
              success: false,
              error: 'Tipo e valor do imposto não especificados',
            }
          }

          const updateData: any = {}
          updateData[params.target_tax_type] = params.target_tax_value

          await supabase
            .from('taxes')
            .update(updateData)
            .eq('country_id', country.id)

          return {
            success: true,
            message: `${params.target_tax_type} alterado para ${params.target_tax_value}%`,
          }
        }

        default:
          return { success: false, error: 'Lei sem efeito definido' }
      }
    } catch (err: any) {
      console.error('❌ Erro ao executar efeito da lei:', err)
      return { success: false, error: err.message }
    }
  }

  // ─── ELEIÇÕES ALEATÓRIAS (12h) ─────────────────────────
  async function runRandomElection(): Promise<{ success: boolean; message?: string }> {
    if (!country?.id || !parliament)
      return { success: false, message: 'Parlamento não encontrado' }

    // Gera mudança aleatória entre 10-20 assentos
    const seatsChange = Math.floor(Math.random() * 11) + 10 // 10-20

    // 50% chance de coalizão ganhar ou perder
    const coalitionGains = Math.random() > 0.5

    let newCoalition = parliament.coalition_seats
    let newOpposition = parliament.opposition_seats

    if (coalitionGains) {
      newCoalition += seatsChange
      newOpposition = Math.max(1, newOpposition - seatsChange)
    } else {
      newOpposition += seatsChange
      newCoalition = Math.max(1, newCoalition - seatsChange)
    }

    // Atualiza no banco
    const { error } = await supabase
      .from('parliament')
      .update({
        coalition_seats: newCoalition,
        opposition_seats: newOpposition,
        last_random_at: new Date().toISOString(),
        election_type: 'random',
      })
      .eq('country_id', country.id)

    if (error)
      return { success: false, message: `Erro na eleição: ${error.message}` }

    // Recarrega dados
    await fetchAll()

    const direction = coalitionGains ? 'Coalizão ganhou' : 'Oposição ganhou'
    return {
      success: true,
      message: `Eleição realizada! ${direction} ${seatsChange} assentos. Novo resultado: ${newCoalition} vs ${newOpposition}`,
    }
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
    forceLawApproval,
    runRandomElection,
    hasCoalitionMajority,
    lastLawResult,
    refetch,
  }
}