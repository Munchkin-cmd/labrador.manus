import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { Database } from '@/types/database'

// ─── TIPOS IMPORTADOS DO database.ts ────────────────────
type EconomyRow = Database['public']['Tables']['economy']['Row']
type RegionRow = Database['public']['Tables']['regions']['Row']
type BuildingCatalogRow = Database['public']['Tables']['building_catalog']['Row']
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

  const fetchAll = useCallback(async () => {
    if (!countryId) {
      setRegions([])
      setBuildings([])
      setCatalog([])
      setEconomy(null)
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === countryId) {
      return
    }

    fetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      // 1. ECONOMIA
      const { data: eData, error: eError } = await supabase
        .from('economy')
        .select('*')
        .eq('country_id', countryId)
        .maybeSingle()

      if (eError) throw eError
      setEconomy(eData || null)

      // 2. REGIÕES
      const { data: rData, error: rError } = await supabase
        .from('regions')
        .select('*')
        .eq('country_id', countryId)

      if (rError) throw rError
      setRegions(rData || [])

      // 3. CATÁLOGO
      const { data: cData, error: cError } = await supabase
        .from('building_catalog')
        .select('*')
        .order('category')

      if (cError) throw cError
      setCatalog(cData || [])

      // 4. EDIFÍCIOS (com join no catálogo)
      const { data: bData, error: bError } = await supabase
        .from('buildings')
        .select(`
          *,
          building_catalog(*)
        `)
        .eq('country_id', countryId)

      if (bError) throw bError

      // Mapeia os dados para incluir o catálogo no objeto
      const buildingsWithCatalog: Building[] = (bData || []).map((item: any) => ({
        ...item,
        building_catalog: item.building_catalog || undefined,
      }))

      setBuildings(buildingsWithCatalog)

      lastLoadedIdRef.current = countryId
    } catch (err: any) {
      console.error('❌ [useEco] Erro:', err)
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

    try {
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