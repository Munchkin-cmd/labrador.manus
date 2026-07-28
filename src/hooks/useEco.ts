import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

// ─── TIPOS ──────────────────────────────────────────────

export interface Economy {
  id: string
  country_id: number
  money: number
  revenue: number
  expenses: number
  exports: number
  imports: number
  inflation: number
  population: number
  pollution: number
  food: number
  gold: number
  iron: number
  oil: number
  wood: number
  uranium: number
  coal: number
  steel: number
  energy: number
  updated_at: string
}

export interface Region {
  id: string
  country_id: number
  name: string
  area_km2: number
  used_area: number
  terrain: string
  is_coastal: boolean
  total_buildings: number
  updated_at: string
  created_at: string
}

export interface BuildingCatalog {
  id: string
  name: string
  type: string
  category: string
  description: string | null
  area_km2: number
  cost_money: number
  cost_food: number
  cost_gold: number
  cost_iron: number
  cost_oil: number
  cost_wood: number
  cost_uranium: number
  cost_steel: number
  cost_coal: number
  build_time_min: number
  maint_money: number
  profit_money: number
  produces: string | null
  produces_qty: number
  energy_produces: number
  energy_cost: number
  requires_coastal: boolean
  requires_energy: boolean
  created_at: string
}

export interface Building {
  id: string
  region_id: string
  country_id: number
  building_catalog_id: string
  quantity: number
  is_built: boolean
  is_active: boolean
  construction_progress: number
  construction_ends_at: string | null
  started_at: string
  finished_at: string
  created_at: string
  updated_at: string
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

  const fetchAll = useCallback(async () => {
    console.log('🔵 [useEco] fetchAll iniciado, countryId:', countryId)

    if (!countryId) {
      console.log('🔴 [useEco] Sem countryId, limpando dados')
      setRegions([])
      setBuildings([])
      setCatalog([])
      setEconomy(null)
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === countryId) {
      console.log('⏸️ [useEco] Já carregando ou já carregado')
      return
    }

    fetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      // 1. ECONOMIA
      console.log('🟡 [useEco] Buscando economia...')
      const { data: eData, error: eError } = await supabase
        .from('economy')
        .select('*')
        .eq('country_id', countryId)
        .maybeSingle()

      if (eError) {
        console.error('❌ [useEco] Erro na economia:', eError)
        throw eError
      }
      console.log('📦 [useEco] Economia:', eData)
      setEconomy(eData || null)

      // 2. REGIÕES
      console.log('🟡 [useEco] Buscando regiões...')
      const { data: rData, error: rError } = await supabase
        .from('regions')
        .select('*')
        .eq('country_id', countryId)

      if (rError) {
        console.error('❌ [useEco] Erro nas regiões:', rError)
        throw rError
      }
      console.log('📦 [useEco] Regiões:', rData)
      setRegions(rData || [])

      // 3. CATÁLOGO (building_catalog)
      console.log('🟡 [useEco] Buscando catálogo...')
      const { data: cData, error: cError } = await supabase
        .from('building_catalog')
        .select('*')
        .order('category')

      if (cError) {
        console.error('❌ [useEco] Erro no catálogo:', cError)
        throw cError
      }
      console.log('📦 [useEco] Catálogo:', cData?.length || 0, 'itens')
      setCatalog(cData || [])

      // 4. EDIFÍCIOS (com catálogo)
      console.log('🟡 [useEco] Buscando edifícios...')
      const { data: bData, error: bError } = await supabase
        .from('buildings')
        .select(`
          *,
          building_catalog(*)
        `)
        .eq('country_id', countryId)

      if (bError) {
        console.error('❌ [useEco] Erro nos edifícios:', bError)
        throw bError
      }
      console.log('📦 [useEco] Edifícios:', bData?.length || 0, 'itens')
      setBuildings(bData || [])

      lastLoadedIdRef.current = countryId
      console.log('✅ [useEco] Dados carregados com sucesso')
    } catch (err: any) {
      console.error('❌ [useEco] Erro geral:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [countryId])

  useEffect(() => {
    if (!countryId) {
      setRegions([])
      setBuildings([])
      setCatalog([])
      setEconomy(null)
      setLoading(false)
      return
    }

    if (lastLoadedIdRef.current !== countryId) {
      fetchAll()
    }
  }, [countryId, fetchAll])

  // ─── CONSTRUIR EDIFÍCIO ──────────────────────────────────

  async function build(regionId: string, buildingType: string, quantity: number = 1): Promise<RpcResult> {
    if (!countryId) return { success: false, error: 'País não encontrado' }

    console.log('🔨 [useEco] Construir:', { regionId, buildingType, quantity })

    try {
      // Verificação de dinheiro (opcional)
      const catalogItem = catalog.find(c => c.type === buildingType)
      if (catalogItem && economy) {
        const totalCost = catalogItem.cost_money * quantity
        if (economy.money < totalCost) {
          return { success: false, error: `Dinheiro insuficiente. Necessário: ${totalCost}, disponível: ${economy.money}` }
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

      console.log('✅ [useEco] Construção iniciada:', data)

      lastLoadedIdRef.current = null
      await fetchAll()

      return (data as RpcResult) ?? { success: false, error: 'Erro desconhecido' }
    } catch (err: any) {
      console.error('❌ [useEco] Erro em build:', err)
      return { success: false, error: err.message }
    }
  }

  // ─── PRODUZIR EQUIPAMENTO ─────────────────────────────────

  async function produceEquipment(equipType: string, quantity: number = 1): Promise<RpcResult> {
    if (!countryId) return { success: false, error: 'País não encontrado' }

    console.log('🏭 [useEco] Produzir equipamento:', { equipType, quantity })

    try {
      const { data, error } = await supabase.rpc('produce_equipment', {
        p_country_id: countryId,
        p_equip_type: equipType,
        p_quantity: quantity,
      })

      if (error) {
        console.error('❌ [useEco] Erro na RPC produce_equipment:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ [useEco] Equipamento produzido:', data)

      lastLoadedIdRef.current = null
      await fetchAll()

      return (data as RpcResult) ?? { success: false, error: 'Erro desconhecido' }
    } catch (err: any) {
      console.error('❌ [useEco] Erro em produceEquipment:', err)
      return { success: false, error: err.message }
    }
  }

  // ─── REFETCH ─────────────────────────────────────────────

  const refetch = useCallback(() => {
    console.log('🔄 [useEco] Refetch manual')
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