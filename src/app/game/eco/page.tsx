'use client'

import { useState } from 'react'
import { useEco } from '@/hooks/useEco'
import { formatMoney, formatNumber } from '@/utils/format'
import { BUILDING_IMAGES } from '@/components/buildingImages' // ✅ IMPORT ADICIONADO
import {
  IoPeople,
  IoDisc,
  IoShield,
  IoAirplane,
  IoCog,
  IoBug,
  IoRocket,
  IoNuclear,
  IoFlame,
  IoChevronDown,
  IoChevronUp,
  IoCheckmarkCircle,
  IoCloseCircle,
} from 'react-icons/io5'

// 🎖️ Mapeamento de Equipamentos Militares com Icons e Pré-requisitos
const MILITARY_UNITS = [
  {
    key: 'soldiers',
    label: 'Soldados',
    icon: IoPeople,
    requires: ['barracks'],
    image: 'https://cdn.noticiabrasil.net.br/img/598/26/5982663_0:0:2634:1482_1920x0_80_0_0_e03a927de99a29314ce350ed74b1f5c9.jpg',
    description: 'Infantaria básica. Requere Quartel.',
  },
  {
    key: 'tanks',
    label: 'Tanques',
    icon: IoDisc,
    requires: ['weapons_factory'],
    image:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTjJB6Ia_s89p88yC6z9jWJy9N0p0D9bvlYN1cETZhE1A&s=10',
    description: 'Blindagem pesada. Requer Fábrica de Armas.',
  },
  {
    key: 'artillery',
    label: 'Artilharia',
    icon: IoFlame,
    requires: ['weapons_factory'],
    image:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRzLaPqTyvk_vEiltFpggiV0Q0DN7-0EK7pHiR1yNFDsYDZj1sLXfQVhA&s=10',
    description: 'Fogo de longo alcance. Requer Fábrica de Armas.',
  },
  {
    key: 'aircraft',
    label: 'Aeronaves',
    icon: IoAirplane,
    requires: ['barracks'],
    image:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/61/F-35A_flight_%28cropped%29.jpg/330px-F-35A_flight_%28cropped%29.jpg',
    description: 'Caças e bombardeiros. Requer Quartel.',
  },
  {
    key: 'helicopters',
    label: 'Helicópteros',
    icon: IoAirplane,
    requires: ['air_base'],
    image:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSMBalQEah5Ve56DwKBZuBSTN--RM7fjYwL6Q82vrAtIEG5PgulC84bpo&s=10',
    description: 'Transporte e apoio aéreo. Requer Base Aérea.',
  },
  {
    key: 'drones',
    label: 'Drones',
    icon: IoBug,
    requires: ['air_base'],
    image:
      'https://www.airway.com.br/uploads/aviation/2022/03/concepcao-artistica-do-drone-bayraktar-kizilelma-primeiro-voo-e-programado-para-2023-baykar-rq5ujwb.webp',
    description: 'Vigilância aérea remota. Requer Base Aérea.',
  },
  {
    key: 'missiles',
    label: 'Mísseis',
    icon: IoRocket,
    requires: ['weapons_factory'],
    image:
      'https://ichef.bbci.co.uk/ace/ws/640/cpsprodpb/633d/live/7f7225a0-7f4a-11f0-83cc-c5da98c419b8.jpg.webp',
    description: 'Armamento de longo alcance. Requer Fábrica de Armas.',
  },
  {
    key: 'warheads',
    label: 'Ogivas',
    icon: IoNuclear,
    requires: ['weapons_factory', 'nuclear_plant'],
    image:
      'https://super.abril.com.br/wp-content/uploads/2017/04/a-22bomba-do-bem22-e-a-volta-do-fantasma-nuclear1.jpg?crop=1&resize=1212,909',
    description: 'Arma nuclear. Requer Fábrica de Armas + Usina Nuclear.',
  },
]

// 🌍 Recursos por Terreno
const TERRAIN_RESOURCES: Record<string, string[]> = {
  planicie: ['Madeira', 'Petróleo', 'Carvão'],
  orogenico: ['Ouro', 'Ferro', 'Urânio'],
  extremista: ['Petróleo', 'Urânio'],
  anfibio: ['Madeira', 'Ouro', 'Petróleo'],
}

export default function EcoPage() {
  const { economy, regions, buildings, catalog, countryData, loading, build, produceEquipment, refetch } = useEco()

  const [expandedRegion, setExpandedRegion] = useState<string | null>(null)
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(null)
  const [expandedMilitary, setExpandedMilitary] = useState<string | null>(null)
  const [buildQty, setBuildQty] = useState(1)
  const [militaryQty, setMilitaryQty] = useState(1)
  const [feedback, setFeedback] = useState('')
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

  // Agrupar edifícios por categoria
  const groupedByCategory = catalog.reduce(
    (acc: Record<string, any[]>, cat) => {
      if (!acc[cat.category]) acc[cat.category] = []
      acc[cat.category].push(cat)
      return acc
    },
    {}
  )

  // Contar edifícios por região
  const buildingCountByRegion = (regionId: string) => {
    return buildings.filter(b => b.region_id === regionId).length
  }

  // Edifícios de uma região
  const getBuildingsInRegion = (regionId: string) => {
    return buildings.filter(b => b.region_id === regionId)
  }

  // Validar pré-requisito militar
  const validateMilitaryRequirements = (requires: string[]) => {
    const builtTypes = new Set(buildings.map(b => b.building_type))
    return requires.every(req => builtTypes.has(req))
  }

  // Handle construir
  const handleBuild = async (regionId: string, buildingType: string) => {
    setSubmitting(true)
    setFeedback('')

    const res = await build(regionId, buildingType, buildQty)
    setFeedback(res.error || res.message || 'Construção iniciada!')
    setBuildQty(1)

    if (res.success) {
      setExpandedRegion(null)
      setExpandedBuilding(null)
      setTimeout(() => setFeedback(''), 3000)
    }

    setSubmitting(false)
  }

  // Handle produzir militar
  const handleProduceMilitary = async (key: string) => {
    setSubmitting(true)
    setFeedback('')

    const res = await produceEquipment(key, militaryQty)
    setFeedback(res.error || res.message || 'Produção iniciada!')
    setMilitaryQty(1)

    if (res.success) {
      setExpandedMilitary(null)
      setTimeout(() => setFeedback(''), 3000)
    }

    setSubmitting(false)
  }

  const terrainResources = TERRAIN_RESOURCES[countryData.terrain?.toLowerCase() || 'planicie'] || []

  return (
    <div className="flex flex-col gap-6 pb-24 px-4 pt-4 max-w-5xl mx-auto w-full">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 📊 PAINEL DE RECURSOS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-surface-card rounded-xl p-4 border border-white/5">
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 🌍 SEU TERRENO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/20 rounded-xl p-4">
        <p className="text-sm font-bold text-white mb-1">
          SEU TERRENO: <span className="text-emerald-300 uppercase">{countryData.terrain || 'Desconhecido'}</span>
        </p>
        <p className="text-xs text-white/60">
          ✨ Aproveite para explorar: <span className="text-emerald-200 font-semibold">{terrainResources.join(', ')}</span>
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 🏢 REGIÕES & EDIFÍCIOS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div>
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Regiões</p>

        {/* ━━━━━ TABELA SIMPLES DE REGIÕES ━━━━━ */}
        <div className="bg-surface-card rounded-xl border border-white/5 overflow-hidden">
          {regions.length === 0 ? (
            <div className="p-4 text-center text-white/40 text-sm">Nenhuma região encontrada</div>
          ) : (
            <>
              {/* Header da Tabela */}
              <div className="grid grid-cols-2 gap-4 px-4 py-3 bg-white/5 border-b border-white/5 font-bold text-xs text-white/60 uppercase">
                <div>Região</div>
                <div className="text-right">Edifícios</div>
              </div>

              {/* Linhas da Tabela (max height + scroll) */}
              <div className="max-h-64 overflow-y-auto">
                {regions.map((region, index) => (
                  <div key={region.id}>
                    {/* Linha Clicável */}
                    <button
                      onClick={() =>
                        setExpandedRegion(expandedRegion === region.id ? null : region.id)
                      }
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

                    {/* EXPANSÃO: Categorias de Edifícios */}
                    {expandedRegion === region.id && (
                      <div className="bg-white/5 px-4 py-4 border-t border-white/5 space-y-4">
                        {Object.entries(groupedByCategory).length === 0 ? (
                          <p className="text-xs text-white/40">Nenhum edifício disponível</p>
                        ) : (
                          Object.entries(groupedByCategory).map(([category, items]) => (
                            <div key={category}>
                              {/* Título da Categoria */}
                              <p className="text-xs font-bold text-white/60 uppercase mb-2">
                                {category}
                              </p>

                              {/* Grid de Edifícios (2-3 colunas) */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {(items as any[]).map(building => (
                                  <button
                                    key={building.type}
                                    onClick={() =>
                                      setExpandedBuilding(
                                        expandedBuilding === building.type ? null : building.type
                                      )
                                    }
                                    className="relative bg-white/10 hover:bg-white/15 border border-white/20 hover:border-primary/50 rounded-lg p-3 transition-all text-left"
                                  >
                                    <p className="text-xs font-bold text-white truncate">
                                      {building.name}
                                    </p>
                                    <p className="text-[10px] text-white/40 mt-1">
                                      {formatMoney(building.cost_money)}
                                    </p>

                                    {/* EXPANSÃO: Modal do Edifício */}
                                    {expandedBuilding === building.type && (
                                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                                        <div className="bg-surface-card border border-primary/50 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
                                          {/* ✅ IMAGEM CORRIGIDA AQUI */}
                                          <div className="w-full h-40 bg-white/10 rounded-lg mb-4 overflow-hidden">
                                            <img
                                              src={BUILDING_IMAGES[building.type] || '/placeholder.png'}
                                              alt={building.name}
                                              className="w-full h-full object-cover"
                                              onError={e => {
                                                e.currentTarget.src = '/placeholder.png'
                                              }}
                                            />
                                          </div>

                                          {/* Nome e Preço */}
                                          <p className="text-lg font-bold text-white mb-1">
                                            {building.name}
                                          </p>
                                          <p className="text-sm text-white/60 mb-4">
                                            Custo:{' '}
                                            <span className="text-emerald-400 font-bold">
                                              {formatMoney(building.cost_money)}
                                            </span>
                                          </p>

                                          {/* Detalhes Simplificados */}
                                          <div className="space-y-2 text-xs text-white/60 mb-4 border-t border-white/10 pt-3">
                                            {building.produces && (
                                              <p>
                                                📦 Produz:{' '}
                                                <span className="text-yellow-400 font-bold">
                                                  300x {building.produces}/24h
                                                </span>
                                              </p>
                                            )}

                                            {building.energy_produces > 0 && (
                                              <p>
                                                ⚡ Energia:{' '}
                                                <span className="text-blue-400 font-bold">
                                                  +300/24h
                                                </span>
                                              </p>
                                            )}

                                            {building.energy_cost > 0 && (
                                              <p>
                                                🔌 Consome:{' '}
                                                <span className="text-red-400 font-bold">
                                                  {building.energy_cost} energia
                                                </span>
                                              </p>
                                            )}

                                            <p className="text-white/40 italic mt-2">
                                              Manutenção: {formatMoney(building.maint_money)}/ciclo
                                            </p>
                                          </div>

                                          {/* Input + Botão */}
                                          <div className="flex gap-2 mt-6 border-t border-white/10 pt-4">
                                            <input
                                              type="number"
                                              min={1}
                                              max={7}
                                              value={buildQty}
                                              onChange={e => setBuildQty(Number(e.target.value))}
                                              className="input-field w-16 text-xs py-2"
                                              placeholder="Qtd"
                                            />
                                            <button
                                              onClick={() => handleBuild(region.id, building.type)}
                                              disabled={submitting}
                                              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-30 text-white font-bold py-2 rounded text-xs transition-colors"
                                            >
                                              {submitting ? 'Construindo...' : 'Construir'}
                                            </button>
                                            <button
                                              onClick={() => setExpandedBuilding(null)}
                                              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition-colors"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 🎖️ EQUIPAMENTOS MILITARES */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div>
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Equipamentos Militares</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {MILITARY_UNITS.map(unit => {
            const Icon = unit.icon
            const hasRequirements = validateMilitaryRequirements(unit.requires)

            return (
              <button
                key={unit.key}
                onClick={() =>
                  setExpandedMilitary(
                    expandedMilitary === unit.key ? null : unit.key
                  )
                }
                className={`relative p-4 rounded-lg border transition-all ${
                  hasRequirements
                    ? 'bg-surface-card border-white/10 hover:border-primary/50 hover:bg-white/5 cursor-pointer'
                    : 'bg-white/5 border-red-500/30 opacity-50 cursor-not-allowed'
                }`}
                disabled={!hasRequirements}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={20} className={hasRequirements ? 'text-primary' : 'text-red-400'} />
                  <span className="text-xs font-bold text-white truncate">{unit.label}</span>
                </div>

                {hasRequirements ? (
                  <IoCheckmarkCircle size={16} className="text-green-400" />
                ) : (
                  <IoCloseCircle size={16} className="text-red-400" />
                )}

                {/* Expansão Militar */}
                {expandedMilitary === unit.key && hasRequirements && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-surface-card border border-primary/50 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
                      <img
                        src={unit.image}
                        alt={unit.label}
                        className="w-full h-40 object-cover rounded-lg mb-4"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />

                      <p className="text-lg font-bold text-white mb-2">{unit.label}</p>
                      <p className="text-xs text-white/60 mb-4">{unit.description}</p>

                      <div className="border-t border-white/10 pt-3 mb-4">
                        <p className="text-xs font-bold text-white/60 uppercase mb-2">Pré-requisitos:</p>
                        <div className="space-y-1">
                          {unit.requires.map(req => (
                            <p key={req} className="text-xs text-emerald-400">
                              ✓ {req}
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-6 border-t border-white/10 pt-4">
                        <input
                          type="number"
                          min={1}
                          value={militaryQty}
                          onChange={e => setMilitaryQty(Number(e.target.value))}
                          className="input-field w-16 text-xs py-2"
                          placeholder="Qtd"
                        />
                        <button
                          onClick={() => handleProduceMilitary(unit.key)}
                          disabled={submitting}
                          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-bold py-2 rounded text-xs transition-colors"
                        >
                          {submitting ? 'Produzindo...' : 'Produzir'}
                        </button>
                        <button
                          onClick={() => setExpandedMilitary(null)}
                          className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Mensagem de requisito não atendido */}
        <p className="text-xs text-red-400/70 mt-3">
          💡 Construa os edifícios necessários para desbloquear equipamentos militares
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 📢 FEEDBACK */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-sm ${
            feedback.includes('insuficiente') || feedback.includes('Erro') || feedback.includes('Limite')
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : 'bg-green-500/10 border border-green-500/30 text-green-400'
          }`}
        >
          {feedback}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════

function ResourceBox({ label, value, isMoney = false }: { label: string; value: number; isMoney?: boolean }) {
  return (
    <div className="text-center p-2 bg-white/5 rounded-lg">
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