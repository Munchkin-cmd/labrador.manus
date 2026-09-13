import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { Database } from '@/types/database'

type EconomyRow = Database['public']['Tables']['economy']['Row']
type RegionRow = Database['public']['Tables']['regions']['Row']
type BuildingCatalogRow = Database['public']['Tables']['building_catalog']['Row']
type BuildingRow = Database['public']['Tables']['buildings']['Row']

export interface Economy extends EconomyRow {}
export interface Region extends RegionRow {}
export interface BuildingCatalog extends BuildingCatalogRow {}
export interface Building extends BuildingRow {
  building_catalog?: BuildingCatalog
  region?: Region
}

type RpcResult = { success: boolean; message?: string; error?: string }

export function useEco() {
  const countryId = useAuthStore(state => state.country?.id)
  const [loading, setLoading] = useState(true)
  const [regions, setRegions] = useState<Region[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [catalog, setCatalog] = useState<BuildingCatalog[]>([])
  const [economy, setEconomy] = useState<Economy | null>(null)
  const [error, setError] = useState<string | null>(null)
  // ✅ Guarda o timestamp do servidor E o momento local em que foi recebido
  const [cycleSnapshot, setCycleSnapshot] = useState<{
    serverTime: string
    receivedAt: number
  } | null>(null)

  const fetchingRef = useRef(false)
  const lastLoadedIdRef = useRef<number | null>(null)

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

  const fetchAll = useCallback(async () => {
    if (!countryId) {
      setRegions([])
      setBuildings([])
      setCatalog([])
      setEconomy(null)
      setLoading(false)
      return
    }

    if (fetchingRef.current || lastLoadedIdRef.current === countryId) return

    fetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const { data: eData, error: eError } = await supabase
        .from('economy')
        .select('*')
        .eq('country_id', countryId)
        .maybeSingle()
      if (eError) throw eError
      setEconomy(eData || null)

      // ✅ Snapshot: guarda o tempo do servidor + o momento local
      if (eData?.last_production_at) {
        const serverTime: string = eData.last_production_at
        setCycleSnapshot({
          serverTime,
          receivedAt: Date.now(),
        })
      }

      const { data: rData, error: rError } = await supabase
        .from('regions')
        .select('*')
        .eq('country_id', countryId)
      if (rError) throw rError
      setRegions(rData || [])

      const { data: cData, error: cError } = await supabase
        .from('building_catalog')
        .select('*')
        .order('category')
      if (cError) throw cError
      setCatalog(cData || [])

      const { data: bData, error: bError } = await supabase
        .from('buildings')
        .select('*')
        .eq('country_id', countryId)
      if (bError) throw bError

      const buildingsWithCatalog: Building[] = (bData || []).map(
        (building: BuildingRow) => {
          const catalogItem = (cData || []).find(
            c => c.type === building.building_type
          )
          return { ...building, building_catalog: catalogItem }
        }
      )
      setBuildings(buildingsWithCatalog)

      await completeFinishedBuildings(buildingsWithCatalog)
    } catch (err: any) {
      setError(err.message)
    } finally {
      lastLoadedIdRef.current = countryId
      setLoading(false)
      fetchingRef.current = false
    }
  }, [countryId, completeFinishedBuildings])

  useEffect(() => {
    if (!countryId) {
      setRegions([])
      setBuildings([])
      setCatalog([])
      setEconomy(null)
      setLoading(false)
      return
    }
    if (lastLoadedIdRef.current !== countryId) fetchAll()
  }, [countryId, fetchAll])

  // ✅ POLLING
  useEffect(() => {
    if (!countryId) return

    const currentCountryId = countryId

    async function pollEconomy() {
      const { data } = await supabase
        .from('economy')
        .select('*')
        .eq('country_id', currentCountryId)
        .maybeSingle()

      if (data) {
        setEconomy(data)

        // Atualiza o snapshot sempre que o servidor devolver um novo last_production_at
        if (data.last_production_at) {
          // ✅ Extraímos para uma constante tipada como string.
          // Isso evita o erro do TS: dentro do callback, ele não "lembra" do if.
          const serverTime: string = data.last_production_at

          setCycleSnapshot(prev => {
            if (!prev || prev.serverTime !== serverTime) {
              return {
                serverTime,
                receivedAt: Date.now(),
              }
            }
            return prev
          })
        }
      }
    }

    pollEconomy()
    const interval = setInterval(pollEconomy, 10000)

    function onFocus() {
      pollEconomy()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [countryId])

  async function build(
    regionId: string,
    buildingType: string,
    quantity: number = 1
  ): Promise<RpcResult> {
    if (!countryId) return { success: false, error: 'País não encontrado' }

    try {
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
      return (data as RpcResult) ?? { success: false, error: 'Erro desconhecido' }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async function produceEquipment(
    equipType: string,
    quantity: number = 1
  ): Promise<RpcResult> {
    if (!countryId) return { success: false, error: 'País não encontrado' }

    try {
      const { data, error } = await supabase.rpc('produce_equipment', {
        p_country_id: countryId,
        p_country_id_: countryId, // compatibilidade
        p_equip_type: equipType,
        p_quantity: quantity,
      } as any)

      if (error) return { success: false, error: error.message }

      lastLoadedIdRef.current = null
      await fetchAll()
      return (data as RpcResult) ?? { success: false, error: 'Erro desconhecido' }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

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
    cycleSnapshot, // ✅ Novo: usado pelo EcoPage
  }
}