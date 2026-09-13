'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { Database } from '@/types/database'
import { MILITARY_IMAGES } from '@/components/buildingImages'

type EconomyRow = Database['public']['Tables']['economy']['Row']
type RegionRow = Database['public']['Tables']['regions']['Row']
type BuildingCatalogRow = Database['public']['Tables']['building_catalog']['Row']
type BuildingRow = Database['public']['Tables']['buildings']['Row']
type CountriesRow = Database['public']['Tables']['countries']['Row']

export interface Economy extends EconomyRow {}
export interface Region extends RegionRow {}
export interface BuildingCatalog extends BuildingCatalogRow {}
export interface Building extends BuildingRow {
  building_catalog?: BuildingCatalog
  region?: Region
}
export interface Country extends CountriesRow {}

type RpcResult = {
  success: boolean
  message?: string
  error?: string
  data?: any
}

export function useEco() {
  const { country, user } = useAuthStore(state => ({
    country: state.country,
    user: state.user,
  }))
  const countryId = country?.id

  const [loading, setLoading] = useState(true)
  const [regions, setRegions] = useState<Region[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [catalog, setCatalog] = useState<BuildingCatalog[]>([])
  const [economy, setEconomy] = useState<Economy | null>(null)
  const [countryData, setCountryData] = useState<Country | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

  // ✅ Completa edifícios quando finished_at chegar
  const completeFinishedBuildings = useCallback(
    async (buildingsToCheck: Building[]) => {
      if (!countryId || buildingsToCheck.length === 0) return

      const now = new Date()
      const completedIds: string[] = []

      for (const building of buildingsToCheck) {
        if (
          !building.is_built &&
          building.finished_at &&
          new Date(building.finished_at) <= now
        ) {
          completedIds.push(building.id)
        }
      }

      if (completedIds.length > 0) {
        for (const id of completedIds) {
          await supabase
            .from('buildings')
            .update({
              is_built: true,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
        }

        setBuildings(prev =>
          prev.map(b =>
            completedIds.includes(b.id)
              ? { ...b, is_built: true, is_active: true }
              : b
          )
        )
      }
    },
    [countryId]
  )

  // ✅ Fetch inicial de todos os dados
  const fetchAll = useCallback(async () => {
    if (!countryId) {
      setRegions([])
      setBuildings([])
      setCatalog([])
      setEconomy(null)
      setCountryData(null)
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === countryId) return

    fetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      // Economy
      const { data: eData, error: eError } = await supabase
        .from('economy')
        .select('*')
        .eq('country_id', countryId)
        .maybeSingle()

      if (eError) throw eError
      setEconomy(eData || null)

      // Country (para pegar terrain)
      const { data: cData, error: cError } = await supabase
        .from('countries')
        .select('*')
        .eq('id', countryId)
        .maybeSingle()

      if (cError) throw cError
      setCountryData(cData || null)

      // Regions
      const { data: rData, error: rError } = await supabase
        .from('regions')
        .select('*')
        .eq('country_id', countryId)
        .order('name')

      if (rError) throw rError
      setRegions(rData || [])

      // Building Catalog
      const { data: catData, error: catError } = await supabase
        .from('building_catalog')
        .select('*')
        .order('category')

      if (catError) throw catError
      setCatalog(catData || [])

      // Buildings (com relação ao catalog)
      const { data: bData, error: bError } = await supabase
        .from('buildings')
        .select('*')
        .eq('country_id', countryId)

      if (bError) throw bError

      const buildingsWithCatalog: Building[] = (bData || []).map(
        (building: BuildingRow) => {
          const catalogItem = (catData || []).find(
            c => c.type === building.building_type
          )
          const region = (rData || []).find(r => r.id === building.region_id)
          return {
            ...building,
            building_catalog: catalogItem,
            region,
          }
        }
      )

      setBuildings(buildingsWithCatalog)
      await completeFinishedBuildings(buildingsWithCatalog)
    } catch (err: any) {
      setError(err.message)
      console.error('useEco fetchAll error:', err)
    } finally {
      lastLoadedIdRef.current = countryId
      setLoading(false)
      fetchingRef.current = false
    }
  }, [countryId, completeFinishedBuildings])

  // ✅ Fetch inicial
  useEffect(() => {
    if (!countryId) {
      setRegions([])
      setBuildings([])
      setCatalog([])
      setEconomy(null)
      setCountryData(null)
      setLoading(false)
      return
    }

    if (lastLoadedIdRef.current !== countryId) {
      fetchAll()
    }
  }, [countryId, fetchAll])

  // ✅ Polling inteligente (30s)
  useEffect(() => {
    if (!countryId) return

    const pollData = async () => {
      try {
        const { data: eData } = await supabase
          .from('economy')
          .select('*')
          .eq('country_id', countryId)
          .maybeSingle()

        if (eData) {
          setEconomy(eData)
        }

        const { data: bData } = await supabase
          .from('buildings')
          .select('*')
          .eq('country_id', countryId)

        if (bData) {
          const updatedBuildings = (bData || []).map((building: BuildingRow) => {
            const catalogItem = catalog.find(
              c => c.type === building.building_type
            )
            const region = regions.find(r => r.id === building.region_id)
            return {
              ...building,
              building_catalog: catalogItem,
              region,
            }
          })
          setBuildings(updatedBuildings)
          await completeFinishedBuildings(updatedBuildings)
        }
      } catch (err: any) {
        console.error('Polling error:', err)
      }
    }

    const interval = setInterval(pollData, 30000)
    return () => clearInterval(interval)
  }, [countryId, catalog, regions, completeFinishedBuildings])

  // ✅ Construir edifício
  async function build(
    regionId: string,
    buildingType: string,
    quantity: number = 1
  ): Promise<RpcResult> {
    if (!countryId)
      return { success: false, error: 'País não encontrado' }

    try {
      // Validação local: limite de 7 edifícios mesma categoria/região
      const buildingsInRegionCategory = buildings.filter(
        b =>
          b.region_id === regionId &&
          b.building_type === buildingType
      )

      const currentQty = buildingsInRegionCategory.reduce(
        (acc, b) => acc + (b.quantity || 1),
        0
      )

      if (currentQty + quantity > 7) {
        return {
          success: false,
          error: `Limite de 7 edifícios da mesma categoria por região. Você já tem ${currentQty}.`,
        }
      }

      // Validação de custo
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

      if (error) return { success: false, error: error.message }

      lastLoadedIdRef.current = null
      await fetchAll()

      return (
        (data as RpcResult) ?? { success: false, error: 'Erro desconhecido' }
      )
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  // ✅ Produzir equipamento militar
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

      if (error) return { success: false, error: error.message }

      lastLoadedIdRef.current = null
      await fetchAll()

      return (
        (data as RpcResult) ?? { success: false, error: 'Erro desconhecido' }
      )
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  // ✅ Refetch manual
  const refetch = useCallback(() => {
    lastLoadedIdRef.current = null
    fetchAll()
  }, [fetchAll])

  return {
    economy,
    regions,
    buildings,
    catalog,
    countryData,
    loading,
    error,
    build,
    produceEquipment,
    refetch,
  }
}