import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { Database } from '@/types/database'

// ─── TIPOS IMPORTADOS DO database.ts ────────────────────
type EconomyRow = Database['public']['Tables']['economy']['Row']
type RegionRow = Database['public']['Tables']['regions']['Row']
type BuildingCatalogRow =
  Database['public']['Tables']['building_catalog']['Row']
type BuildingRow = Database['public']['Tables']['buildings']['Row']

// ─── INTERFACES PARA USO NO HOOK (com joins) ────────────
export interface Economy extends EconomyRow {}
export interface Region extends RegionRow {}
export interface BuildingCatalog extends BuildingCatalogRow {}
export interface Building extends BuildingRow {
  building_catalog?: BuildingCatalog
  region?: Region
}

type RpcResult = { success: boolean; message?: string; error?: string }

// ─── HOOK ────────────────────────────────────────────────
export function useEco() {
  const countryId = useAuthStore(state => state.country?.id)
  const [loading, setLoading] = useState(true)
  const [regions, setRegions] = useState<Region[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [catalog, setCatalog] = useState<BuildingCatalog[]>([])
  const [economy, setEconomy] = useState<Economy | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

  // ─── 🎬 NOVA FUNÇÃO: Rodar ciclo de produção ─────────────────
  const runProductionCycle = useCallback(async () => {
    console.log('🎬 [useEco] Rodando production cycle...')

    try {
      const { data, error } = await supabase.rpc(
        'run_production_cycle'
      )

      if (error) {
        console.error('❌ [useEco] Erro em run_production_cycle:', error)
        return
      }

      console.log('✅ [useEco] Production cycle concluído')
      return data
    } catch (err: any) {
      console.error('❌ [useEco] Erro ao rodar production cycle:', err.message)
    }
  }, [])

  // ─── 🔧 FUNÇÃO: Marcar buildings completos ─────────────
  const completeFinishedBuildings = useCallback(
    async (buildingsToCheck: Building[]) => {
      if (!countryId || buildingsToCheck.length === 0) return

      const now = new Date()
      const completedIds: string[] = []
      const completedBuildings: Building[] = []

      // 🔍 Verificar quais buildings já terminaram a construção
      for (const building of buildingsToCheck) {
        if (
          !building.is_built &&
          building.finished_at &&
          new Date(building.finished_at) <= now
        ) {
          completedIds.push(building.id)
          completedBuildings.push({
            ...building,
            is_built: true,
            is_active: true,
          })

          console.log(
            `✅ [useEco] Building pronto: ${building.id} (${building.building_type})`
          )
        }
      }

      // 📝 Se há buildings prontos, atualizar no banco
      if (completedIds.length > 0) {
        console.log(
          `🔄 [useEco] Marcando ${completedIds.length} buildings como completos...`
        )

        try {
          // Atualizar cada building no banco (o trigger SQL também vai rodar)
          for (const id of completedIds) {
            const { error } = await supabase
              .from('buildings')
              .update({
                is_built: true,
                is_active: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', id)

            if (error) {
              console.error(
                `❌ [useEco] Erro ao marcar ${id} como completo:`,
                error
              )
            }
          }

          // ✅ Atualizar state local imediatamente (sem refetch)
          setBuildings(prevBuildings =>
            prevBuildings.map(b =>
              completedIds.includes(b.id)
                ? { ...b, is_built: true, is_active: true }
                : b
            )
          )

          console.log(
            `✅ [useEco] ${completedIds.length} buildings marcados como completos`
          )
        } catch (err: any) {
          console.error(
            '❌ [useEco] Erro ao atualizar buildings completos:',
            err.message
          )
        }
      }
    },
    [countryId]
  )

  const fetchAll = useCallback(async () => {
    console.log('🔍 [useEco] fetchAll() chamado. countryId:', countryId)

    if (!countryId) {
      console.warn(
        '⚠️ [useEco] countryId não definido, limpando estado'
      )
      setRegions([])
      setBuildings([])
      setCatalog([])
      setEconomy(null)
      setLoading(false)
      return
    }

    if (fetchingRef.current) {
      console.warn('⚠️ [useEco] fetchAll já em progresso, ignorando chamada')
      return
    }

    if (lastLoadedIdRef.current === countryId) {
      console.warn('⚠️ [useEco] countryId igual ao anterior, ignorando')
      return
    }

    fetchingRef.current = true
    console.log('✅ [useEco] Iniciando fetch. setLoading(true)')
    setLoading(true)
    setError(null)

    try {
      // 1. ECONOMIA
      console.log('📡 [useEco] Fetching economy para country_id:', countryId)
      const { data: eData, error: eError } = await supabase
        .from('economy')
        .select('*')
        .eq('country_id', countryId)
        .maybeSingle()

      if (eError) {
        console.error('❌ [useEco] Erro economy:', eError)
        throw eError
      }
      console.log('✅ [useEco] Economy recebido:', eData)
      setEconomy(eData || null)

      // 2. REGIÕES
      console.log('📡 [useEco] Fetching regions para country_id:', countryId)
      const { data: rData, error: rError } = await supabase
        .from('regions')
        .select('*')
        .eq('country_id', countryId)

      if (rError) {
        console.error('❌ [useEco] Erro regions:', rError)
        throw rError
      }
      console.log('✅ [useEco] Regions recebido:', rData?.length || 0, 'regiões')
      setRegions(rData || [])

      // 3. CATÁLOGO (sem filtro de country, é global)
      console.log('📡 [useEco] Fetching building_catalog')
      const { data: cData, error: cError } = await supabase
        .from('building_catalog')
        .select('*')
        .order('category')

      if (cError) {
        console.error('❌ [useEco] Erro building_catalog:', cError)
        throw cError
      }
      console.log('✅ [useEco] Catalog recebido:', cData?.length || 0, 'tipos')
      setCatalog(cData || [])

      // 4. EDIFÍCIOS - SEM JOIN DIRETO (porque a relação é por 'type', não 'id')
      console.log(
        '📡 [useEco] Fetching buildings para country_id:',
        countryId
      )
      const { data: bData, error: bError } = await supabase
        .from('buildings')
        .select('*')
        .eq('country_id', countryId)

      if (bError) {
        console.error('❌ [useEco] Erro buildings:', bError)
        throw bError
      }
      console.log(
        '✅ [useEco] Buildings recebido:',
        bData?.length || 0,
        'edifícios'
      )

      // ✅ JOIN MANUAL: associa cada building com seu catalog
      const buildingsWithCatalog: Building[] = (bData || []).map(
        (building: BuildingRow) => {
          const catalogItem = (cData || []).find(
            c => c.type === building.building_type
          )
          return {
            ...building,
            building_catalog: catalogItem,
          }
        }
      )

      console.log(
        '✅ [useEco] Buildings com catalog:',
        buildingsWithCatalog.length
      )
      setBuildings(buildingsWithCatalog)

      // 🔧 Marcar buildings completos (roda UMA VEZ após fetch)
      await completeFinishedBuildings(buildingsWithCatalog)

      // 🎬 Rodar ciclo de produção
      await runProductionCycle()

      // 🔄 Refetch economia após production cycle (para mostrar novos valores)
      const { data: eDataNew } = await supabase
        .from('economy')
        .select('*')
        .eq('country_id', countryId)
        .maybeSingle()

      if (eDataNew) {
        console.log('✅ [useEco] Economy atualizada após production cycle:', eDataNew)
        setEconomy(eDataNew)
      }

      lastLoadedIdRef.current = countryId
    } catch (err: any) {
      console.error('❌ [useEco] ERRO CRÍTICO:', err.message)
      console.error('Stack:', err.stack)
      setError(err.message)
    } finally {
      console.log('✅ [useEco] Fetch concluído. setLoading(false)')
      setLoading(false)
      fetchingRef.current = false
    }
  }, [countryId, completeFinishedBuildings, runProductionCycle])

  // ─── CARREGA DADOS APENAS QUANDO countryId MUDA ──────────────
  useEffect(() => {
    console.log('🔄 [useEco] useEffect triggered. countryId:', countryId)

    if (!countryId) {
      console.warn('⚠️ [useEco] countryId não definido no useEffect')
      setRegions([])
      setBuildings([])
      setCatalog([])
      setEconomy(null)
      setLoading(false)
      return
    }

    if (lastLoadedIdRef.current !== countryId) {
      console.log('📡 [useEco] CountryId mudou, chamando fetchAll()')
      fetchAll()
    } else {
      console.log('⏭️ [useEco] CountryId igual ao anterior, pulando fetch')
    }
  }, [countryId, fetchAll])

  // ─── CONSTRUIR EDIFÍCIO ──────────────────────────────────
  async function build(
    regionId: string,
    buildingType: string,
    quantity: number = 1
  ): Promise<RpcResult> {
    if (!countryId)
      return { success: false, error: 'País não encontrado' }

    try {
      // Valida se tem dinheiro antes de chamar RPC
      const catalogItem = catalog.find(c => c.type === buildingType)
      if (catalogItem && economy) {
        const totalCost = catalogItem.cost_money * quantity
        if (economy.money < totalCost) {
          return {
            success: false,
            error: `Dinheiro insuficiente. Necessário: ${totalCost}, disponível: ${economy.money}`,
          }
        }
      }

      const { data, error } = await supabase.rpc('construct_building', {
        p_country_id: countryId,
        p_region_id: regionId,
        p_building_type: buildingType,
        p_quantity: quantity,
      })

      if (error) {
        console.error('❌ [useEco] Erro na RPC construct_building:', error)
        return { success: false, error: error.message }
      }

      // Força reload após construir
      lastLoadedIdRef.current = null
      await fetchAll()

      return (data as RpcResult) ?? {
        success: false,
        error: 'Erro desconhecido',
      }
    } catch (err: any) {
      console.error('❌ [useEco] Erro em build:', err)
      return { success: false, error: err.message }
    }
  }

  // ─── PRODUZIR EQUIPAMENTO ─────────────────────────────────
  async function produceEquipment(
    equipType: string,
    quantity: number = 1
  ): Promise<RpcResult> {
    if (!countryId)
      return { success: false, error: 'País não encontrado' }

    try {
      const { data, error } = await supabase.rpc('produce_equipment', {
        p_country_id: countryId,
        p_equip_type: equipType,
        p_quantity: quantity,
      })

      if (error) {
        console.error(
          '❌ [useEco] Erro na RPC produce_equipment:',
          error
        )
        return { success: false, error: error.message }
      }

      // Força reload após produzir
      lastLoadedIdRef.current = null
      await fetchAll()

      return (data as RpcResult) ?? {
        success: false,
        error: 'Erro desconhecido',
      }
    } catch (err: any) {
      console.error('❌ [useEco] Erro em produceEquipment:', err)
      return { success: false, error: err.message }
    }
  }

  // ─── REFETCH ─────────────────────────────────────────────
  const refetch = useCallback(() => {
    lastLoadedIdRef.current = null
    fetchAll()
  }, [fetchAll])

  return {
    economy,
    regions,
    buildings,
    catalog,
    loading,
    error,
    build,
    produceEquipment,
    refetch,
  }
}