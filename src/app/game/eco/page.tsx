'use client'

import { useState } from 'react'
import { useEco } from '@/hooks/useEco'
import { formatMoney, formatNumber } from '@/utils/format'
import { BUILDING_IMAGES, MILITARY_IMAGES } from '@/components/buildingImages'
import {
  IoPeople,
  IoDisc,
  IoAirplane,
  IoBug,
  IoRocket,
  IoNuclear,
  IoFlame,
  IoChevronDown,
  IoChevronUp,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoClose,
} from 'react-icons/io5'

const MILITARY_UNITS = [
  { key: 'soldiers', label: 'Soldados', icon: IoPeople, requires: ['barracks'], description: 'Infantaria básica. Requere Quartel.' },
  { key: 'tanks', label: 'Tanques', icon: IoDisc, requires: ['weapons_factory'], description: 'Blindagem pesada. Requer Fábrica de Armas.' },
  { key: 'artillery', label: 'Artilharia', icon: IoFlame, requires: ['weapons_factory'], description: 'Fogo de longo alcance. Requer Fábrica de Armas.' },
  { key: 'aircraft', label: 'Aeronaves', icon: IoAirplane, requires: ['barracks'], description: 'Caças e bombardeiros. Requer Quartel.' },
  { key: 'helicopters', label: 'Helicópteros', icon: IoAirplane, requires: ['air_base'], description: 'Transporte e apoio aéreo. Requer Base Aérea.' },
  { key: 'drones', label: 'Drones', icon: IoBug, requires: ['air_base'], description: 'Vigilância aérea remota. Requer Base Aérea.' },
  { key: 'missiles', label: 'Mísseis', icon: IoRocket, requires: ['weapons_factory'], description: 'Armamento de longo alcance. Requer Fábrica de Armas.' },
  { key: 'warheads', label: 'Ogivas', icon: IoNuclear, requires: ['weapons_factory', 'nuclear_plant'], description: 'Arma nuclear. Requer Fábrica de Armas + Usina Nuclear.' },
]

const TERRAIN_RESOURCES: Record<string, string[]> = {
  planicie: ['Madeira', 'Petróleo', 'Carvão'],
  orogenico: ['Ouro', 'Ferro', 'Urânio'],
  extremista: ['Petróleo', 'Urânio'],
  anfibio: ['Madeira', 'Ouro', 'Petróleo'],
}

export default function EcoPage() {
  const { economy, regions, buildings, catalog, countryData, loading, build, produceEquipment, refetch } = useEco()

  const [expandedRegion, setExpandedRegion] = useState<string | null>(null)
  const [selectedBuilding, setSelectedBuilding] = useState<{ regionId: string; building: any } | null>(null)
  const [selectedMilitary, setSelectedMilitary] = useState<any | null>(null)

  const [buildQty, setBuildQty] = useState(1)
  const [militaryQty, setMilitaryQty] = useState(1)
  
  const [modalFeedback, setModalFeedback] = useState('')
  const [pageFeedback, setPageFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <LoadingSpinner />

  if (!economy || !countryData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <p className="text-white/60 text-sm">Dados não encontrados</p>
        <button onClick={refetch} className="mt-4 px-4 py-2 bg-primary hover:bg-primary/80 rounded-lg text-sm">
          Recarregar
        </button>
      </div>
    )
  }

  const groupedByCategory = catalog.reduce((acc: Record<string, any[]>, cat) => {
    if (!acc[cat.category]) acc[cat.category] = []
    acc[cat.category].push(cat)
    return acc
  }, {})

  const buildingCountByRegion = (regionId: string) => {
    return buildings.filter(b => b.region_id === regionId).length
  }

  const validateMilitaryRequirements = (requires: string[]) => {
    const builtTypes = new Set(buildings.map(b => b.building_type))
    return requires.every(req => builtTypes.has(req))
  }

  const handleBuild = async (regionId: string, buildingType: string) => {
    setSubmitting(true)
    setModalFeedback('')
    setPageFeedback('')

    const res = await build(regionId, buildingType, buildQty)
    
    if (res.success) {
      setSelectedBuilding(null)
      setPageFeedback('✅ Construção iniciada com sucesso!')
      setTimeout(() => setPageFeedback(''), 3000)
    } else {
      setModalFeedback(res.error || 'Erro ao construir')
    }
    
    setBuildQty(1)
    setSubmitting(false)
  }

  const handleProduceMilitary = async (key: string) => {
    setSubmitting(true)
    setModalFeedback('')
    setPageFeedback('')

    const res = await produceEquipment(key, militaryQty)
    
    if (res.success) {
      setSelectedMilitary(null)
      setPageFeedback('✅ Produção iniciada com sucesso!')
      setTimeout(() => setPageFeedback(''), 3000)
    } else {
      setModalFeedback(res.error || 'Erro ao produzir')
    }
    
    setMilitaryQty(1)
    setSubmitting(false)
  }

  const terrainResources = TERRAIN_RESOURCES[countryData.terrain?.toLowerCase() || 'planicie'] || []

  return (
    <div className="flex flex-col gap-6 pb-24 px-4 pt-4 max-w-5xl mx-auto w-full relative">
      {/* PAINEL DE RECURSOS */}
      <div className="bg-surface-card rounded-xl p-4 border border-white/5 backdrop-blur-md">
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Recursos</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          <ResourceBox label="Comida" value={economy.food || 0} />
          <ResourceBox label="Ouro" value={economy.gold || 0} />
          <ResourceBox label="Ferro" value={economy.iron || 0} />
          <ResourceBox label="Petróleo" value={economy.oil || 0} />
          <ResourceBox label="Madeira" value={economy.wood || 0} />
          <ResourceBox label="Urânio" value={economy.uranium || 0} />
          <ResourceBox label="Carvão" value={economy.coal || 0} />
          <ResourceBox label="Aço" value={economy.steel || 0} />
          <ResourceBox label="Energia" value={economy.energy || 0} />
          <ResourceBox label="Dinheiro" value={economy.money || 0} isMoney />
        </div>
      </div>

      {/* TERRENO */}
      <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/20 rounded-xl p-4 backdrop-blur-sm">
        <p className="text-sm font-bold text-white mb-1">
          SEU TERRENO: <span className="text-emerald-300 uppercase">{countryData.terrain || 'Desconhecido'}</span>
        </p>
        <p className="text-xs text-white/60">
          ✨ Aproveite para explorar: <span className="text-emerald-200 font-semibold">{terrainResources.join(', ')}</span>
        </p>
      </div>

      {/* FEEDBACK GERAL DA PÁGINA */}
      {pageFeedback && (
        <div className="p-3 rounded-lg text-sm border bg-green-500/10 border-green-500/30 text-green-400 text-center">
          {pageFeedback}
        </div>
      )}

      {/* REGIÕES */}
      <div>
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Regiões</p>
        <div className="bg-surface-card rounded-xl border border-white/5 overflow-hidden backdrop-blur-md">
          {regions.length === 0 ? (
            <div className="p-4 text-center text-white/40 text-sm">Nenhuma região encontrada</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 px-4 py-3 bg-white/5 border-b border-white/5 font-bold text-xs text-white/60 uppercase">
                <div>Região</div>
                <div className="text-right">Edifícios</div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {regions.map((region) => (
                  <div key={region.id}>
                    <button
                      onClick={() => setExpandedRegion(expandedRegion === region.id ? null : region.id)}
                      className="w-full px-4 py-3 grid grid-cols-2 gap-4 items-center hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{region.name}</span>
                        {expandedRegion === region.id ? (
                          <IoChevronUp className="text-primary ml-auto" size={18} />
                        ) : (
                          <IoChevronDown className="text-white/40 ml-auto" size={18} />
                        )}
                      </div>
                      <div className="text-right text-white/60 text-sm">
                        {buildingCountByRegion(region.id)} edifício{buildingCountByRegion(region.id) !== 1 ? 's' : ''}
                      </div>
                    </button>

                    {expandedRegion === region.id && (
                      <div className="bg-white/5 px-4 py-4 border-t border-white/5 space-y-4">
                        {Object.entries(groupedByCategory).length === 0 ? (
                          <p className="text-xs text-white/40">Nenhum edifício disponível</p>
                        ) : (
                          Object.entries(groupedByCategory).map(([category, items]) => (
                            <div key={category}>
                              <p className="text-xs font-bold text-white/60 uppercase mb-2">{category}</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {(items as any[]).map(building => (
                                  <button
                                    key={building.type}
                                    onClick={() => {
                                      setSelectedBuilding({ regionId: region.id, building })
                                      setModalFeedback('')
                                    }}
                                    className="relative bg-white/10 hover:bg-white/15 border border-white/20 hover:border-primary/50 rounded-lg p-3 transition-all text-left flex flex-col justify-between"
                                  >
                                    <p className="text-xs font-bold text-white truncate">{building.name}</p>
                                    <p className="text-[10px] text-white/40 mt-1">{formatMoney(building.cost_money)}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* EQUIPAMENTOS MILITARES */}
      <div>
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Equipamentos Militares</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {MILITARY_UNITS.map(unit => {
            const Icon = unit.icon
            const hasRequirements = validateMilitaryRequirements(unit.requires)
            return (
              <button
                key={unit.key}
                onClick={() => {
                  setSelectedMilitary(unit)
                  setModalFeedback('')
                }}
                className={`relative p-4 rounded-lg border transition-all flex flex-col items-start ${
                  hasRequirements
                    ? 'bg-surface-card border-white/10 hover:border-primary/50 hover:bg-white/5 cursor-pointer backdrop-blur-md'
                    : 'bg-white/5 border-red-500/30 opacity-50 cursor-not-allowed'
                }`}
                disabled={!hasRequirements}
              >
                <div className="flex items-center gap-2 mb-2 w-full">
                  <Icon size={20} className={hasRequirements ? 'text-primary' : 'text-red-400'} />
                  <span className="text-xs font-bold text-white truncate">{unit.label}</span>
                </div>
                {hasRequirements ? (
                  <IoCheckmarkCircle size={16} className="text-green-400" />
                ) : (
                  <IoCloseCircle size={16} className="text-red-400" />
                )}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-red-400/70 mt-3">
          💡 Construa os edifícios necessários para desbloquear equipamentos militares
        </p>
      </div>

      {/* MODAL DE CONSTRUÇÃO */}
      {selectedBuilding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-[#1a1a2e] border border-primary/50 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setSelectedBuilding(null)}
              className="absolute top-3 right-3 z-50 text-white bg-black/60 hover:bg-red-600 rounded-full p-2 transition-colors cursor-pointer border border-white/10 shadow-lg"
              aria-label="Fechar"
            >
              <IoClose size={20} />
            </button>

            <div className="overflow-y-auto w-full h-full custom-scrollbar rounded-xl">
              
              <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-slate-700 to-slate-900 relative flex items-center justify-center">
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
                  <span className="text-6xl mb-1">🏭</span>
                </div>
                {BUILDING_IMAGES[selectedBuilding.building.type] && (
                  <img
                    src={BUILDING_IMAGES[selectedBuilding.building.type]}
                    alt={selectedBuilding.building.name}
                    className="w-full h-full object-cover relative z-10"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                )}
              </div>

              <div className="p-5 sm:p-6 pb-2">
                <p className="text-xl font-bold text-white mb-1">
                  {selectedBuilding.building.name}
                </p>
                <p className="text-sm text-white/60 mb-5">
                  Custo:{' '}
                  <span className="text-emerald-400 font-bold text-base">
                    {formatMoney(selectedBuilding.building.cost_money)}
                  </span>
                </p>

                {/* ✅ CORREÇÃO: Exibe o valor real do banco de dados sem duplicar energia */}
                <div className="space-y-3 text-sm text-white/80 border-t border-white/10 pt-4 mb-6">
                  {/* Produção normal (Comida, Ferro, etc.) */}
                  {selectedBuilding.building.produces && selectedBuilding.building.produces !== 'energy' && (
                    <p>
                      📦 Produz:{' '}
                      <span className="text-yellow-400 font-bold">
                        {selectedBuilding.building.produces_qty || 0}x {selectedBuilding.building.produces}/15min
                      </span>
                    </p>
                  )}

                  {/* Produção de Energia (Unificada na coluna produces) */}
                  {selectedBuilding.building.produces === 'energy' && (
                    <p>
                      ⚡ Energia:{' '}
                      <span className="text-blue-400 font-bold">
                        +{selectedBuilding.building.produces_qty || 0}/15min
                      </span>
                    </p>
                  )}

                  {/* Consumo de Energia */}
                  {selectedBuilding.building.energy_cost > 0 && (
                    <p>
                      🔌 Consome:{' '}
                      <span className="text-red-400 font-bold">
                        {selectedBuilding.building.energy_cost} energia
                      </span>
                    </p>
                  )}

                  <p className="text-white/40 italic mt-3 text-xs">
                    Manutenção: {formatMoney(selectedBuilding.building.maint_money)}/ciclo
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-[#151526] border-t border-white/10 flex flex-col gap-3">
                
                {modalFeedback && (
                  <div className="p-3 rounded-lg text-sm border bg-red-500/10 border-red-500/30 text-red-400 text-center font-bold">
                    ⚠️ {modalFeedback}
                  </div>
                )}

                <div className="flex gap-3">
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={buildQty}
                    onChange={e => setBuildQty(Number(e.target.value))}
                    className="input-field w-20 text-sm py-2 text-center"
                    placeholder="Qtd"
                  />
                  <button
                    onClick={() => handleBuild(selectedBuilding.regionId, selectedBuilding.building.type)}
                    disabled={submitting}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-30 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-lg"
                  >
                    {submitting ? 'Construindo...' : 'Construir'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL MILITAR */}
      {selectedMilitary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-[#1a1a2e] border border-primary/50 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setSelectedMilitary(null)}
              className="absolute top-3 right-3 z-50 text-white bg-black/60 hover:bg-red-600 rounded-full p-2 transition-colors cursor-pointer border border-white/10 shadow-lg"
              aria-label="Fechar"
            >
              <IoClose size={20} />
            </button>

            <div className="overflow-y-auto w-full h-full custom-scrollbar rounded-xl">
              
              <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-slate-700 to-slate-900 relative flex items-center justify-center">
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
                  <span className="text-6xl mb-1">🎖️</span>
                </div>
                {MILITARY_IMAGES[selectedMilitary.key] && (
                  <img
                    src={MILITARY_IMAGES[selectedMilitary.key]}
                    alt={selectedMilitary.label}
                    className="w-full h-full object-cover relative z-10"
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                )}
              </div>

              <div className="p-5 sm:p-6 pb-2">
                <p className="text-xl font-bold text-white mb-2">{selectedMilitary.label}</p>
                <p className="text-sm text-white/70 mb-5">{selectedMilitary.description}</p>

                <div className="border-t border-white/10 pt-4 mb-6">
                  <p className="text-xs font-bold text-white/60 uppercase mb-3">Pré-requisitos:</p>
                  <div className="space-y-1">
                    {selectedMilitary.requires.map((req: string) => (
                      <p key={req} className="text-sm text-emerald-400">
                        ✓ {req}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-[#151526] border-t border-white/10 flex flex-col gap-3">
                
                {modalFeedback && (
                  <div className="p-3 rounded-lg text-sm border bg-red-500/10 border-red-500/30 text-red-400 text-center font-bold">
                    ⚠️ {modalFeedback}
                  </div>
                )}

                <div className="flex gap-3">
                  <input
                    type="number"
                    min={1}
                    value={militaryQty}
                    onChange={e => setMilitaryQty(Number(e.target.value))}
                    className="input-field w-20 text-sm py-2 text-center"
                    placeholder="Qtd"
                  />
                  <button
                    onClick={() => handleProduceMilitary(selectedMilitary.key)}
                    disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-lg"
                  >
                    {submitting ? 'Produzindo...' : 'Produzir'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResourceBox({ label, value, isMoney = false }: { label: string; value: number; isMoney?: boolean }) {
  return (
    <div className="text-center p-2 bg-white/5 rounded-lg border border-white/5 hover:border-white/20 transition-colors">
      <p className="text-[10px] font-bold text-white/40 uppercase">{label}</p>
      <p className={`text-xs font-bold mt-1 ${isMoney ? 'text-yellow-400' : 'text-white'}`}>
        {isMoney ? formatMoney(value) : formatNumber(value)}
      </p>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}