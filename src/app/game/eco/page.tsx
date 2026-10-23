'use client'

import { useState, useEffect } from 'react'
import { useEco } from '@/hooks/useEco'
import { formatMoney, formatNumber } from '@/utils/format'
import { BUILDING_IMAGES, MILITARY_IMAGES } from '@/components/buildingImages'
import { supabase } from '@/lib/supabase/client'
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
  IoTimeOutline,
  IoWarning,
  IoBusiness,
  IoConstruct,
  IoCash,
  IoCube,
  IoFlash,
  IoTime,
  IoTrash,
  IoStatsChart,
  IoPerson,
  IoTrendingUp,
} from 'react-icons/io5'

const MILITARY_UNITS = [
  { key: 'soldiers', label: 'Soldados', icon: IoPeople, requires: ['barracks'], description: 'Infantaria básica. Requere Quartel.' },
  { key: 'tanks', label: 'Tanques', icon: IoDisc, requires: ['weapons_factory'], description: 'Blindagem pesada. Requer Fábrica de Armas.' },
  { key: 'artillery', label: 'Artilharia', icon: IoFlame, requires: ['weapons_factory'], description: 'Fogo de longo alcance. Requer Fábrica de Armas.' },
  { key: 'aircraft', label: 'Aeronaves', icon: IoAirplane, requires: ['barracks'], description: 'Caças e bombardeiros. Requer Quartel.' },
  { key: 'helicopters', label: 'Helicópteros', icon: IoAirplane, requires: ['air_base'], description: 'Transporte e apoio aéreo. Requer Base Aérea.' },
  { key: 'drones', label: 'Drones', icon: IoBug, requires: ['air_base'], description: 'Vigilância aérea remota. Requer Base Aérea.' },
  { key: 'missiles', label: 'Mísseis', icon: IoRocket, requires: ['weapons_factory'], description: 'Armamento de longo alcance. Requer Fábrica de Armas.' },
  { key: 'warheads', label: 'Ogivas', icon: IoNuclear, requires: ['weapons_factory', 'nuclear_power_plant'], description: 'Arma nuclear. Requer Fábrica de Armas + Usina Nuclear.' },
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

  // ⏱️ ESTADO DO RELÓGIO DE CICLO (15 MINUTOS)
  const [timeLeft, setTimeLeft] = useState('15:00')

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const secondsIntoHour = now.getMinutes() * 60 + now.getSeconds()
      const cycleDuration = 15 * 60 // 15 minutos em segundos
      const secondsLeft = cycleDuration - (secondsIntoHour % cycleDuration)
      
      const mins = Math.floor(secondsLeft / 60)
      const secs = secondsLeft % 60
      
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <LoadingSpinner />

  if (!economy || !countryData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <p className="text-white/60 text-sm font-mono">DADOS NÃO ENCONTRADOS.</p>
        <button onClick={refetch} className="mt-4 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-sm font-bold">
          Recarregar
        </button>
      </div>
    )
  }

  // ✅ ALERTAS
  const paralyzedBuildings = buildings.filter((b: any) => b.is_paralyzed === true)
  const hasParalyzedBuildings = paralyzedBuildings.length > 0
  const hasParalyzedPowerPlants = paralyzedBuildings.some((b: any) => b.building_catalog?.produces === 'energy')

  const groupedByCategory = catalog.reduce((acc: Record<string, any[]>, cat) => {
    if (!acc[cat.category]) acc[cat.category] = []
    acc[cat.category].push(cat)
    return acc
  }, {})

  const buildingCountByRegion = (regionId: string) => {
    return buildings.filter(b => b.region_id === regionId).length
  }

  // Resumo de Edifícios por Tipo no país
  const myBuildingsSummary = buildings.reduce((acc, b) => {
    if (!b.is_built) return acc
    const type = b.building_type
    const qty = Number(b.quantity || 1)
    const name = b.building_catalog?.name || type
    
    if (!acc[type]) {
      acc[type] = { name, totalQty: 0, isParalyzed: false }
    }
    acc[type].totalQty += qty
    if (b.is_paralyzed) acc[type].isParalyzed = true
    return acc
  }, {} as Record<string, { name: string, totalQty: number, isParalyzed: boolean }>)

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

  const handleDestroy = async (regionId: string, buildingType: string) => {
    if (!window.confirm("Tem certeza que deseja DESTRUIR este edifício? A ação é irreversível.")) return
    setSubmitting(true)
    setModalFeedback('')

    const { error } = await supabase
      .from('buildings')
      .delete()
      .eq('region_id', regionId)
      .eq('building_type', buildingType)

    if (error) {
      setModalFeedback(error.message)
    } else {
      setSelectedBuilding(null)
      setPageFeedback('💥 Edifício destruído com sucesso!')
      refetch()
      setTimeout(() => setPageFeedback(''), 3000)
    }
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

  const renderCostList = (building: any, prefix: 'cost' | 'maint') => {
    const items = [
      { key: `${prefix}_money`, label: 'Dinheiro', icon: <IoCash size={14} className="text-green-400" /> },
      { key: `${prefix}_food`, label: 'Comida', icon: <IoCube size={14} className="text-orange-400" /> },
      { key: `${prefix}_wood`, label: 'Madeira', icon: <IoCube size={14} className="text-amber-600" /> },
      { key: `${prefix}_iron`, label: 'Ferro', icon: <IoCube size={14} className="text-gray-400" /> },
      { key: `${prefix}_coal`, label: 'Carvão', icon: <IoCube size={14} className="text-gray-600" /> },
      { key: `${prefix}_oil`, label: 'Petróleo', icon: <IoCube size={14} className="text-black" /> },
      { key: `${prefix}_steel`, label: 'Aço', icon: <IoCube size={14} className="text-cyan-400" /> },
      { key: `${prefix}_gold`, label: 'Ouro', icon: <IoCube size={14} className="text-yellow-400" /> },
      { key: `${prefix}_uranium`, label: 'Urânio', icon: <IoCube size={14} className="text-green-600" /> },
    ]

    const activeItems = items.filter(i => building[i.key] > 0)

    if (activeItems.length === 0) {
      return <span className="text-white/40 italic font-mono text-[10px]">Nenhum recurso.</span>
    }

    return (
      <div className="flex flex-wrap gap-2 mt-1">
        {activeItems.map(item => (
          <span key={item.key} className="flex items-center gap-1 bg-black/30 border border-white/5 px-2 py-0.5 rounded text-[10px] font-mono text-white/80">
            {item.icon} {formatNumber(building[item.key])} {item.label}
          </span>
        ))}
      </div>
    )
  }

  // ✅ Cálculo de inflação e mão de obra para o modal
  let inflation = 0
  let inflatedCost = 0
  let laborCost = 0
  
  if (selectedBuilding) {
    inflation = Number(economy?.inflation || 0)
    const baseCost = Number(selectedBuilding.building.cost_money || 0)
    inflatedCost = baseCost * (1 + (inflation / 100))
    laborCost = Number(selectedBuilding.building.labor_cost || 0)
  }

  return (
    <div className="flex flex-col gap-6 pb-24 px-4 sm:px-6 pt-6 max-w-5xl mx-auto w-full relative">
      
      {/* PAINEL DE RECURSOS COM RELÓGIO */}
      <div className="bg-surface-card border border-surface-border rounded-lg p-4 shadow-lg">
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-bold tracking-widest text-white/50 uppercase flex items-center gap-2">
            <div className="w-1 h-3 bg-primary rounded-full" />
            Recursos
          </p>
          
          <div className="flex items-center gap-1.5 bg-surface-input border border-surface-border px-2.5 py-1 rounded-md text-primary font-mono text-sm font-bold shadow-inner">
            <IoTimeOutline size={16} />
            <span>{timeLeft}</span>
          </div>
        </div>

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

        {/* ✅ NOVOS DADOS: IDH, CRESCIMENTO E INFLAÇÃO */}
        <div className="col-span-3 sm:col-span-5 grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-surface-border">
          <div className="text-center p-2 bg-surface-input border border-surface-border rounded-lg">
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider flex items-center justify-center gap-1">
              <IoStatsChart size={10} /> IDH
            </p>
            <p className="text-xs font-bold mt-1 font-mono text-blue-400">{Number((economy as any).idh || 0).toFixed(3)}</p>
          </div>
          <div className="text-center p-2 bg-surface-input border border-surface-border rounded-lg">
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider flex items-center justify-center gap-1">
              <IoPeople size={10} /> Cresc. Pop.
            </p>
            <p className="text-xs font-bold mt-1 font-mono text-green-400">+{Number((economy as any).population_growth || 0).toFixed(1)}%</p>
          </div>
          <div className="text-center p-2 bg-surface-input border border-surface-border rounded-lg">
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider flex items-center justify-center gap-1">
              <IoTrendingUp size={10} /> Inflação
            </p>
            <p className={`text-xs font-bold mt-1 font-mono ${Number((economy as any).inflation || 0) > 10 ? 'text-red-400' : 'text-yellow-400'}`}>
              {Number((economy as any).inflation || 0).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* ✅ ALERTAS */}
      {hasParalyzedBuildings && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-[11px] font-mono font-bold uppercase tracking-widest text-center flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse">
          <IoWarning size={18} />
          ALERTA: EDIFÍCIOS PARALISADOS POR FALTA DE RECURSOS/ENERGIA!
        </div>
      )}
      {hasParalyzedPowerPlants && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-3 rounded-lg text-[11px] font-mono font-bold uppercase tracking-widest text-center flex items-center justify-center gap-2">
          <IoFlash size={18} />
          AVISO: USINAS PARALISADAS NÃO ESTÃO GERANDO ENERGIA!
        </div>
      )}

      {/* TERRENO */}
      <div className="bg-surface-input border border-surface-border rounded-lg p-4">
        <p className="text-xs font-bold text-white mb-1 uppercase tracking-widest">
          SEU TERRENO: <span className="text-primary">{countryData.terrain || 'Desconhecido'}</span>
        </p>
        <p className="text-[10px] text-white/50 font-mono">
          ✨ Aproveite para explorar: <span className="text-white/80 font-semibold">{terrainResources.join(', ')}</span>
        </p>
      </div>

      {pageFeedback && (
        <div className="p-3 rounded-lg text-sm border bg-green-500/10 border-green-500/30 text-green-400 text-center font-mono">
          {pageFeedback}
        </div>
      )}

      {/* DASHBOARD MEUS EDIFÍCIOS */}
      <div>
        <div className="flex items-center gap-2 mb-2 pl-1">
          <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          <p className="text-xs font-bold tracking-widest text-white uppercase">Meus Edifícios</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-lg p-4 shadow-lg">
          {Object.keys(myBuildingsSummary).length === 0 ? (
            <p className="text-white/40 text-xs font-mono text-center uppercase">Nenhum edifício construído</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Object.values(myBuildingsSummary).map((item: any, idx) => (
                <div key={idx} className={`border rounded-lg p-2.5 flex items-center justify-between ${item.isParalyzed ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-primary/10 border-primary/30 text-primary'}`}>
                  <div className="flex items-center gap-2 truncate">
                    <IoBusiness size={16} className="shrink-0" />
                    <span className="text-xs font-semibold truncate">{item.name}</span>
                  </div>
                  <span className="font-bold font-mono text-sm ml-2 bg-black/30 px-2 py-0.5 rounded">
                    {item.totalQty}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* REGIÕES */}
      <div>
        <div className="flex items-center gap-2 mb-2 pl-1">
          <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          <p className="text-xs font-bold tracking-widest text-white uppercase">Regiões</p>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden shadow-lg">
          {regions.length === 0 ? (
            <div className="p-4 text-center text-white/40 text-xs font-mono uppercase">Nenhuma região encontrada</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 px-4 py-3 bg-surface-input border-b border-surface-border font-bold text-[10px] text-white/50 uppercase tracking-widest">
                <div>Região</div>
                <div className="text-right">Edifícios</div>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {regions.map((region) => (
                  <div key={region.id}>
                    <button
                      onClick={() => setExpandedRegion(expandedRegion === region.id ? null : region.id)}
                      className="w-full px-4 py-3 grid grid-cols-2 gap-4 items-center hover:bg-white/5 transition-colors border-b border-surface-border last:border-b-0 text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-semibold uppercase tracking-wider">{region.name}</span>
                        {expandedRegion === region.id ? (
                          <IoChevronUp className="text-primary ml-auto" size={18} />
                        ) : (
                          <IoChevronDown className="text-white/40 ml-auto" size={18} />
                        )}
                      </div>
                      <div className="text-right text-white/60 text-xs font-mono">
                        {buildingCountByRegion(region.id)} edifício{buildingCountByRegion(region.id) !== 1 ? 's' : ''}
                      </div>
                    </button>

                    {expandedRegion === region.id && (
                      <div className="bg-surface-input px-4 py-4 border-t border-surface-border space-y-5">
                        
                        {/* Edifícios Construídos NESTA Região */}
                        <div>
                          <p className="text-[10px] font-bold text-primary uppercase font-mono tracking-widest mb-2 flex items-center gap-2">
                            <IoCheckmarkCircle size={14} /> Construídos nesta Região
                          </p>
                          {buildings.filter(b => b.region_id === region.id && b.is_built).length === 0 ? (
                            <p className="text-xs text-white/40 font-mono italic">Nenhum edifício construído aqui ainda.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {buildings.filter(b => b.region_id === region.id && b.is_built).map((b, idx) => (
                                <button 
                                  key={idx} 
                                  onClick={() => {
                                    const catItem = catalog.find(c => c.type === b.building_type)
                                    if (catItem) setSelectedBuilding({ regionId: region.id, building: catItem })
                                  }}
                                  className={`border rounded-md px-2 py-1 flex items-center gap-2 text-[10px] transition-colors ${b.is_paralyzed ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' : 'bg-surface-card border-surface-border text-white/80 hover:bg-white/10'}`}
                                >
                                  {b.is_paralyzed && <IoWarning size={12} />}
                                  <span>{b.building_catalog?.name || b.building_type}</span>
                                  <span className="font-bold font-mono bg-black/30 px-1.5 rounded">x{b.quantity}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* CATÁLOGO DE CONSTRUÇÃO */}
                        <div>
                          <p className="text-[10px] font-bold text-white/50 uppercase font-mono tracking-widest mb-2 border-t border-surface-border pt-3">
                            Construir Novo Edifício
                          </p>
                          {Object.entries(groupedByCategory).length === 0 ? (
                            <p className="text-xs text-white/40 font-mono">Nenhum edifício disponível no catálogo</p>
                          ) : (
                            Object.entries(groupedByCategory).map(([category, items]) => (
                              <div key={category} className="mb-4">
                                <p className="text-[9px] font-bold text-white/40 uppercase font-mono tracking-widest mb-2">{category}</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {(items as any[]).map(building => (
                                    <button
                                      key={building.type}
                                      onClick={() => {
                                        setSelectedBuilding({ regionId: region.id, building })
                                        setModalFeedback('')
                                      }}
                                      className="relative bg-surface-card hover:bg-[#1A263F] border border-surface-border hover:border-primary/50 rounded-lg p-2.5 transition-all text-left flex flex-col justify-between"
                                    >
                                      <p className="text-[11px] font-bold text-white truncate">{building.name}</p>
                                      <p className="text-[10px] text-white/50 mt-1 font-mono">{formatMoney(building.cost_money)}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* EQUIPAMENTOS MILITARES (Mantido) */}
      <div>
        <div className="flex items-center gap-2 mb-2 pl-1">
          <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          <p className="text-xs font-bold tracking-widest text-white uppercase">Equipamentos Militares</p>
        </div>
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
                    ? 'bg-surface-card border-surface-border hover:border-primary/50 hover:bg-[#1A263F] cursor-pointer'
                    : 'bg-surface-input border-red-500/20 opacity-50 cursor-not-allowed'
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
      </div>

      {/* MODAL DE CONSTRUÇÃO / DESTRUIÇÃO */}
      {selectedBuilding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity">
          <div className="bg-surface-card border border-surface-border rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setSelectedBuilding(null)}
              className="absolute top-3 right-3 z-50 text-white bg-black/60 hover:bg-red-600 rounded-full p-2 transition-colors cursor-pointer border border-surface-border shadow-lg"
            >
              <IoClose size={20} />
            </button>

            <div className="overflow-y-auto w-full h-full custom-scrollbar rounded-xl">
              
              <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-slate-800 to-[#0A0F1C] relative flex items-center justify-center border-b border-surface-border">
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
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
                <p className="text-xl font-bold text-white mb-1 uppercase tracking-wider">
                  {selectedBuilding.building.name}
                </p>
                
                {/* ✅ NOVO CUSTO COM INFLAÇÃO */}
                <div className="mb-5 font-mono uppercase tracking-widest">
                  <p className="text-xs text-white/60">Custo Base:</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {inflation > 0 ? (
                      <>
                        <span className="line-through text-white/40 text-sm">{formatMoney(selectedBuilding.building.cost_money)}</span>
                        <span className="text-primary font-bold text-sm">{formatMoney(inflatedCost)}</span>
                        <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] border border-red-500/20 font-bold flex items-center gap-1">
                          <IoWarning size={10} /> Inflação: +{inflation.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-primary font-bold text-sm">{formatMoney(selectedBuilding.building.cost_money)}</span>
                    )}
                  </div>

                  {laborCost > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-white/60 flex items-center gap-1"><IoPerson size={12}/> Mão de Obra:</span>
                      <span className="text-blue-400 font-bold text-sm">{formatNumber(laborCost)} pop</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4 border-t border-surface-border pt-4 mb-6 mt-4">
                  
                  {/* Produção e Consumo */}
                  <div className="bg-surface-input border border-surface-border rounded-lg p-3">
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <IoConstruct size={12} /> Funcionamento (a cada 15min)
                    </p>
                    {selectedBuilding.building.produces ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/70">Produz:</span>
                        <span className="text-yellow-400 font-bold font-mono bg-yellow-400/10 px-2 py-0.5 rounded">
                          +{selectedBuilding.building.produces_qty || 0} {selectedBuilding.building.produces}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-white/40 italic">Não produz recursos.</span>
                    )}

                    {selectedBuilding.building.energy_cost > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-white/70">Consome Energia:</span>
                        <span className="text-red-400 font-bold font-mono bg-red-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                          <IoFlash size={10} /> -{selectedBuilding.building.energy_cost}
                        </span>
                      </div>
                    )}

                    {selectedBuilding.building.profit_money > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-white/70">Rende (Lucro):</span>
                        <span className="text-green-400 font-bold font-mono bg-green-400/10 px-2 py-0.5 rounded">
                          +{formatMoney(selectedBuilding.building.profit_money)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Custo de Construção */}
                  <div className="bg-surface-input border border-surface-border rounded-lg p-3">
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <IoTime size={12} /> Custo de Construção (por unidade)
                    </p>
                    {renderCostList(selectedBuilding.building, 'cost')}
                  </div>

                  {/* Manutenção */}
                  <div className="bg-surface-input border border-surface-border rounded-lg p-3">
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <IoWarning size={12} /> Manutenção (por ciclo)
                    </p>
                    {renderCostList(selectedBuilding.building, 'maint')}
                  </div>

                </div>
              </div>

              <div className="p-4 sm:p-5 bg-surface-input border-t border-surface-border flex flex-col gap-3">
                {modalFeedback && (
                  <div className="p-3 rounded-lg text-xs font-mono border bg-red-500/10 border-red-500/30 text-red-400 text-center font-bold">
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
                    className="input-field w-20 text-sm py-2 text-center bg-[#0A0F1C]"
                    placeholder="Qtd"
                  />
                  <button
                    onClick={() => handleBuild(selectedBuilding.regionId, selectedBuilding.building.type)}
                    disabled={submitting}
                    className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-30 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-lg uppercase tracking-wider"
                  >
                    {submitting ? 'Construindo...' : 'Construir'}
                  </button>
                  
                  {/* Botão Destruir: Aparece apenas se o prédio já existir na região */}
                  {buildings.some(b => b.region_id === selectedBuilding.regionId && b.building_type === selectedBuilding.building.type) && (
                    <button
                      type="button"
                      onClick={() => handleDestroy(selectedBuilding.regionId, selectedBuilding.building.type)}
                      disabled={submitting}
                      className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center"
                      title="Destruir Edifício"
                    >
                      <IoTrash size={18} />
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL MILITAR (Mantido) */}
      {selectedMilitary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity">
          <div className="bg-surface-card border border-surface-border rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setSelectedMilitary(null)}
              className="absolute top-3 right-3 z-50 text-white bg-black/60 hover:bg-red-600 rounded-full p-2 transition-colors cursor-pointer border border-surface-border shadow-lg"
            >
              <IoClose size={20} />
            </button>

            <div className="overflow-y-auto w-full h-full custom-scrollbar rounded-xl">
              
              <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-slate-800 to-[#0A0F1C] relative flex items-center justify-center border-b border-surface-border">
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
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
                <p className="text-xl font-bold text-white mb-2 uppercase tracking-wider">{selectedMilitary.label}</p>
                <p className="text-xs text-white/60 mb-5 font-mono">{selectedMilitary.description}</p>

                <div className="border-t border-surface-border pt-4 mb-6">
                  <p className="text-[10px] font-bold text-white/50 uppercase mb-3 tracking-widest">Pré-requisitos:</p>
                  <div className="space-y-1">
                    {selectedMilitary.requires.map((req: string) => (
                      <p key={req} className="text-xs text-primary font-mono">
                        ✓ {req}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-surface-input border-t border-surface-border flex flex-col gap-3">
                {modalFeedback && (
                  <div className="p-3 rounded-lg text-xs font-mono border bg-red-500/10 border-red-500/30 text-red-400 text-center font-bold">
                    ⚠️ {modalFeedback}
                  </div>
                )}

                <div className="flex gap-3">
                  <input
                    type="number"
                    min={1}
                    value={militaryQty}
                    onChange={e => setMilitaryQty(Number(e.target.value))}
                    className="input-field w-20 text-sm py-2 text-center bg-[#0A0F1C]"
                    placeholder="Qtd"
                  />
                  <button
                    onClick={() => handleProduceMilitary(selectedMilitary.key)}
                    disabled={submitting}
                    className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-30 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-lg uppercase tracking-wider"
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
    <div className="text-center p-2 bg-surface-input border border-surface-border rounded-lg hover:border-primary/40 transition-colors">
      <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-bold mt-1 font-mono ${isMoney ? 'text-primary' : 'text-white'}`}>
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