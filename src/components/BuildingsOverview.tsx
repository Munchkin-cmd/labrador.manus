// ========================================
// 🏗️ BuildingsOverview Component
// ========================================

import { useState } from 'react'
import { Building, BuildingCatalog } from '@/hooks/useEco'
import { formatNumber } from '@/utils/format'
import { BarChart3, ChevronDown, ChevronUp, MapPin } from 'lucide-react'

interface BuildingsOverviewProps {
  buildings: Building[]
  catalog: BuildingCatalog[]
  regions: any[]
}

interface BuildingSummary {
  type: string
  name: string
  total: number
  built: number
  building: number
  area_used: number
}

interface RegionBuildings {
  region_id: string
  region_name: string
  total: number
  built: number
  building: number
  area_used: number
  buildings: Building[]
}

export function BuildingsOverview({
  buildings,
  catalog,
  regions,
}: BuildingsOverviewProps) {
  // ─── EXPANSÃO DOS PAINÉIS ─────────────────────────────
  const [showTotal, setShowTotal] = useState(false)
  const [showByRegion, setShowByRegion] = useState(false)

  // 🔍 Agrupar buildings por tipo (TOTAL)
  const buildingsByType = catalog.reduce((acc, cat) => {
    const typeBuildings = buildings.filter(b => b.building_type === cat.type)

    if (typeBuildings.length > 0) {
      const built = typeBuildings.filter(b => b.is_built).length
      const building = typeBuildings.filter(b => !b.is_built).length
      const total = typeBuildings.reduce((sum, b) => sum + (b.quantity || 1), 0)
      const area_used = typeBuildings.reduce(
        (sum, b) => sum + cat.area_km2 * (b.quantity || 1),
        0
      )

      acc.push({
        type: cat.type,
        name: cat.name,
        total,
        built,
        building,
        area_used,
      })
    }

    return acc
  }, [] as BuildingSummary[])

  // 🗺️ Agrupar buildings por REGIÃO
  const buildingsByRegion = regions.map(region => {
    const regionBuildings = buildings.filter(b => b.region_id === region.id)
    const built = regionBuildings.filter(b => b.is_built).length
    const building = regionBuildings.filter(b => !b.is_built).length
    const total = regionBuildings.reduce((sum, b) => sum + (b.quantity || 1), 0)
    const area_used = regionBuildings.reduce((sum, b) => {
      const cat = catalog.find(c => c.type === b.building_type)
      return sum + (cat ? cat.area_km2 * (b.quantity || 1) : 0)
    }, 0)

    return {
      region_id: region.id,
      region_name: region.name,
      total,
      built,
      building,
      area_used,
      buildings: regionBuildings,
    } as RegionBuildings
  })

  const regionsWithBuildings = buildingsByRegion.filter(r => r.total > 0)

  // ─── RESUMO NUMÉRICO PARA OS CABEÇALHOS ──────────────
  const totalAll = buildings.reduce((s, b) => s + (b.quantity || 1), 0)
  const builtAll = buildings.filter(b => b.is_built).length
  const buildingAll = buildings.filter(b => !b.is_built).length

  return (
    <div className="flex flex-col gap-4">

      {/* ══════════════════════════════════════════════════════ */}
      {/* 📊 PAINEL: RESUMO TOTAL (expansível)                */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="bg-surface-card rounded-xl border border-white/5 overflow-hidden">
        <button
          onClick={() => setShowTotal(v => !v)}
          className="w-full flex items-center justify-between gap-3 p-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <BarChart3 size={16} className="text-white/40 flex-shrink-0" />
            <span className="text-xs font-bold tracking-widest text-white/40 uppercase">
              Edifícios — Total
            </span>
            <span className="text-[10px] text-white/30 truncate">
              {totalAll} no total · {builtAll} prontos · {buildingAll} em obra
            </span>
          </div>
          {showTotal ? (
            <ChevronUp size={16} className="text-white/40 flex-shrink-0" />
          ) : (
            <ChevronDown size={16} className="text-white/40 flex-shrink-0" />
          )}
        </button>

        {showTotal && (
          <div className="px-3 pb-3 pt-1 border-t border-white/5">
            {buildingsByType.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {buildingsByType.map(summary => (
                  <div
                    key={summary.type}
                    className="bg-white/5 rounded-lg p-2.5 border border-white/5"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-xs font-semibold truncate">
                          {summary.name}
                        </p>
                        <p className="text-white/30 text-[10px]">{summary.type}</p>
                      </div>
                      <p className="text-white font-bold text-sm flex-shrink-0 ml-2">
                        {summary.total}
                      </p>
                    </div>

                    <div className="flex gap-1 mb-1.5">
                      {summary.built > 0 && (
                        <div className="flex-1 flex items-center gap-1">
                          <div className="flex-1 h-1 bg-green-500/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{
                                width: `${(summary.built / summary.total) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-green-400 text-[10px] font-semibold">
                            {summary.built}
                          </span>
                        </div>
                      )}

                      {summary.building > 0 && (
                        <div className="flex-1 flex items-center gap-1">
                          <div className="flex-1 h-1 bg-yellow-500/30 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500"
                              style={{
                                width: `${(summary.building / summary.total) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-yellow-400 text-[10px] font-semibold">
                            {summary.building}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-white/30 text-[10px]">
                      Área: {formatNumber(summary.area_used)} km²
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-xs text-center py-4">
                Nenhum edifício construído ainda
              </p>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* 🗺️ PAINEL: POR REGIÃO (expansível)                   */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="bg-surface-card rounded-xl border border-white/5 overflow-hidden">
        <button
          onClick={() => setShowByRegion(v => !v)}
          className="w-full flex items-center justify-between gap-3 p-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MapPin size={16} className="text-white/40 flex-shrink-0" />
            <span className="text-xs font-bold tracking-widest text-white/40 uppercase">
              Edifícios — Por Região
            </span>
            <span className="text-[10px] text-white/30 truncate">
              {regionsWithBuildings.length} de {regions.length} regiões com obras
            </span>
          </div>
          {showByRegion ? (
            <ChevronUp size={16} className="text-white/40 flex-shrink-0" />
          ) : (
            <ChevronDown size={16} className="text-white/40 flex-shrink-0" />
          )}
        </button>

        {showByRegion && (
          <div className="px-3 pb-3 pt-2 border-t border-white/5 space-y-2">
            {regionsWithBuildings.length === 0 ? (
              <p className="text-white/30 text-xs text-center py-4">
                Nenhuma região possui edifícios
              </p>
            ) : (
              regionsWithBuildings.map(region => (
                <div
                  key={region.region_id}
                  className="bg-white/5 rounded-lg p-2.5 border border-white/5"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-xs truncate">
                        {region.region_name}
                      </p>
                      <p className="text-white/40 text-[10px]">
                        {region.total} edifício{region.total !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-white/60 text-[10px]">
                        {region.built}
                        <span className="text-green-400"> ✓</span>
                        {' / '}
                        {region.building}
                        <span className="text-yellow-400"> ⏳</span>
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex gap-1 mb-1.5">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded-full"
                        style={{
                          width: `${(region.built / region.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-white/40">
                    <span>Área: {formatNumber(region.area_used)} km²</span>
                    <span>Total: {formatNumber(region.total)}</span>
                  </div>

                  {/* Edifícios listados */}
                  <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                    {region.buildings.map(building => {
                      const cat = catalog.find(
                        c => c.type === building.building_type
                      )
                      return (
                        <div
                          key={building.id}
                          className="flex justify-between items-center text-[10px]"
                        >
                          <span className="text-white/60 truncate">
                            {cat?.name} × {building.quantity || 1}
                          </span>
                          <span
                            className={`font-semibold flex-shrink-0 ml-2 ${
                              building.is_built
                                ? 'text-green-400'
                                : 'text-yellow-400'
                            }`}
                          >
                            {building.is_built ? '✓ Pronto' : '⏳ Construindo'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}