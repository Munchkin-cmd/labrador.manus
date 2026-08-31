// ========================================
// 🏗️ BuildingsOverview Component
// Para adicionar em src/app/game/eco/page.tsx
// ========================================

import { Building, BuildingCatalog } from '@/hooks/useEco'
import { formatNumber } from '@/utils/format'
import { BarChart3 } from 'lucide-react'

interface BuildingsOverviewProps {
  buildings: Building[]
  catalog: BuildingCatalog[]
  regions: any[]
}

// ─── Tipo de resumo de edifício ────────────────────────
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
  // 🔍 Agrupar buildings por tipo (TOTAL)
  const buildingsByType = catalog.reduce((acc, cat) => {
    const typeBuildings = buildings.filter(b => b.building_type === cat.type)
    
    if (typeBuildings.length > 0) {
      const built = typeBuildings.filter(b => b.is_built).length
      const building = typeBuildings.filter(b => !b.is_built).length
      const total = typeBuildings.reduce((sum, b) => sum + (b.quantity || 1), 0)
      const area_used = typeBuildings.reduce(
        (sum, b) => sum + (cat.area_km2 * (b.quantity || 1)),
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
    const total = regionBuildings.reduce(
      (sum, b) => sum + (b.quantity || 1),
      0
    )
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

  // 📊 Filtrar regiões que têm edifícios
  const regionsWithBuildings = buildingsByRegion.filter(r => r.total > 0)

  return (
    <div className="flex flex-col gap-4">
      {/* ─── RESUMO TOTAL ────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={18} className="text-white/40" />
          <p className="text-xs font-bold tracking-widest text-white/40 uppercase">
            Edifícios - Total
          </p>
        </div>

        {buildingsByType.length > 0 ? (
          <div className="bg-surface-card rounded-xl p-4 border border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {buildingsByType.map(summary => (
              <div
                key={summary.type}
                className="bg-white/5 rounded-lg p-3 border border-white/5"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="text-white/70 text-sm font-semibold">
                      {summary.name}
                    </p>
                    <p className="text-white/40 text-xs">
                      {summary.type}
                    </p>
                  </div>
                  <p className="text-white font-bold text-lg">
                    {summary.total}
                  </p>
                </div>

                {/* Status bars */}
                <div className="flex gap-1 mb-2">
                  {/* Built */}
                  {summary.built > 0 && (
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 h-1.5 bg-green-500/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: `${(summary.built / summary.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-green-400 text-xs font-semibold">
                        {summary.built}
                      </span>
                    </div>
                  )}

                  {/* Building */}
                  {summary.building > 0 && (
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 h-1.5 bg-yellow-500/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 rounded-full"
                          style={{
                            width: `${(summary.building / summary.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-yellow-400 text-xs font-semibold">
                        {summary.building}
                      </span>
                    </div>
                  )}
                </div>

                {/* Area info */}
                <p className="text-white/30 text-xs">
                  Área: {formatNumber(summary.area_used)} km²
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-card rounded-xl p-4 border border-white/5 text-center">
            <p className="text-white/40 text-sm">
              Nenhum edifício construído ainda
            </p>
          </div>
        )}
      </div>

      {/* ─── POR REGIÃO ──────────────────────────────────── */}
      {regionsWithBuildings.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={18} className="text-white/40" />
            <p className="text-xs font-bold tracking-widest text-white/40 uppercase">
              Edifícios - Por Região
            </p>
          </div>

          <div className="bg-surface-card rounded-xl p-4 border border-white/5 space-y-3">
            {regionsWithBuildings.map(region => (
              <div
                key={region.region_id}
                className="bg-white/5 rounded-lg p-3 border border-white/5"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">
                      {region.region_name}
                    </p>
                    <p className="text-white/40 text-xs">
                      {region.total} edifício{region.total !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-white/60 text-xs">
                      {region.built}
                      <span className="text-green-400"> ✓</span>
                      {' / '}
                      {region.building}
                      <span className="text-yellow-400"> ⏳</span>
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex gap-1 mb-2">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded-full"
                      style={{
                        width: `${(region.built / region.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-xs text-white/40">
                  <span>Área: {formatNumber(region.area_used)} km²</span>
                  <span>Total: {formatNumber(region.total)}</span>
                </div>

                {/* Edifícios listados */}
                <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                  {region.buildings.map(building => {
                    const cat = catalog.find(c => c.type === building.building_type)
                    return (
                      <div
                        key={building.id}
                        className="flex justify-between items-center text-xs"
                      >
                        <span className="text-white/60">
                          {cat?.name} × {building.quantity || 1}
                        </span>
                        <span
                          className={`font-semibold ${
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}