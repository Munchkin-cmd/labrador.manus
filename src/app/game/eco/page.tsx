'use client'
import { useState, useEffect } from 'react'
import { useEco } from '@/hooks/useEco'
import { useWar } from '@/hooks/useWar'
import { formatMoney, formatNumber, formatTime } from '@/utils/format'
import { Hammer, Factory, Package, RefreshCw } from 'lucide-react'

const UNITS = [
  { key: 'soldiers', label: 'Soldados', emoji: '⚔️', cost: 5000000 },
  { key: 'tanks', label: 'Tanques', emoji: '🛡️', cost: 20000000 },
  { key: 'artillery', label: 'Artilharia', emoji: '💣', cost: 15000000 },
  { key: 'aircraft', label: 'Aeronaves', emoji: '✈️', cost: 80000000 },
  { key: 'helicopters', label: 'Helicópteros', emoji: '🚁', cost: 40000000 },
  { key: 'drones', label: 'Drones', emoji: '🤖', cost: 10000000 },
  { key: 'missiles', label: 'Mísseis', emoji: '🎯', cost: 50000000 },
  { key: 'warheads', label: 'Ogivas', emoji: '☢️', cost: 100000000 },
]

export default function EcoPage() {
  const { economy, regions, buildings, catalog, loading, build, produceEquipment, refetch } = useEco()
  const { military } = useWar()

  console.log('🔍 [EcoPage] RENDER - loading:', loading)
  console.log('🔍 [EcoPage] economy:', economy)
  console.log('🔍 [EcoPage] regions:', regions)
  console.log('🔍 [EcoPage] catalog:', catalog?.length || 0)
  console.log('🔍 [EcoPage] buildings:', buildings)

  // ─── ESTADOS DE CONSTRUÇÃO ──────────────────────────────
  const [selectedRegion, setReg] = useState('')
  const [selectedType, setType] = useState('')
  const [qty, setQty] = useState(1)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSub] = useState(false)

  // ─── ESTADOS DE PRODUÇÃO ────────────────────────────────
  const [prodUnit, setProdUnit] = useState('')
  const [prodQty, setProdQty] = useState(1)
  const [prodFeedback, setProdFeedback] = useState('')
  const [prodSubmitting, setProdSub] = useState(false)

  // ─── HANDLERS ────────────────────────────────────────────
  async function handleBuild() {
    console.log('🔨 [EcoPage] handleBuild chamado:', { selectedRegion, selectedType, qty })
    if (!selectedRegion || !selectedType) {
      console.warn('⚠️ [EcoPage] Região ou tipo não selecionado')
      return
    }
    setSub(true)
    setFeedback('')

    const res = await build(selectedRegion, selectedType, qty)
    console.log('📢 [EcoPage] Build response:', res)
    setFeedback(res?.message ?? res?.error ?? 'Erro')
    setSub(false)
  }

  async function handleProduce() {
    console.log('🎯 [EcoPage] handleProduce chamado:', { prodUnit, prodQty })
    if (!prodUnit) {
      console.warn('⚠️ [EcoPage] Unidade não selecionada')
      return
    }
    setProdSub(true)
    setProdFeedback('')

    const res = await produceEquipment(prodUnit, prodQty)
    console.log('📢 [EcoPage] Produce response:', res)
    setProdFeedback(res?.message ?? res?.error ?? 'Erro')
    setProdSub(false)
  }

  // ─── FILTROS PARA CATÁLOGO ─────────────────────────────
  const selectedCat = catalog.find(c => c.type === selectedType)
  const grouped = catalog.reduce((acc: Record<string, any[]>, c) => {
    if (!acc[c.category]) acc[c.category] = []
    acc[c.category].push(c)
    return acc
  }, {})

  if (loading) {
    console.log('⏳ [EcoPage] Renderizando LOADING')
    return <Loading />
  }

  if (!economy) {
    console.log('❌ [EcoPage] Sem economia')
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <p className="text-white/60 text-sm">Dados econômicos não encontrados.</p>
        <p className="text-white/30 text-xs mt-2">Verifique se a economia está configurada para o seu país.</p>
        <button
          onClick={() => {
            console.log('🔄 [EcoPage] Manual refetch')
            refetch()
          }}
          className="mt-4 btn-primary text-sm py-2 px-4"
        >
          Recarregar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-24 px-4 pt-4 max-w-4xl mx-auto w-full">
      {/* ─── FINANÇAS ────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2">Finanças</p>
        <div className="bg-surface-card rounded-xl p-4 border border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-white/40 text-[10px] uppercase">Dinheiro</p>
            <p className="text-white font-bold text-sm">{formatMoney(economy.money || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-white/40 text-[10px] uppercase">Receita</p>
            <p className="text-green-400 font-bold text-sm">{formatMoney(economy.revenue || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-white/40 text-[10px] uppercase">Despesa</p>
            <p className="text-red-400 font-bold text-sm">{formatMoney(economy.expenses || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-white/40 text-[10px] uppercase">População</p>
            <p className="text-white font-bold text-sm">{formatNumber(economy.population || 0)}</p>
          </div>
        </div>
      </div>

      {/* ─── RECURSOS ────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2">Recursos</p>
        <div className="bg-surface-card rounded-xl p-4 border border-white/5 grid grid-cols-3 sm:grid-cols-6 gap-2">
          <Resource label="Comida" value={economy.food || 0} />
          <Resource label="Ouro" value={economy.gold || 0} />
          <Resource label="Ferro" value={economy.iron || 0} />
          <Resource label="Petróleo" value={economy.oil || 0} />
          <Resource label="Madeira" value={economy.wood || 0} />
          <Resource label="Urânio" value={economy.uranium || 0} />
          <Resource label="Carvão" value={economy.coal || 0} />
          <Resource label="Aço" value={economy.steel || 0} />
          <Resource label="Energia" value={economy.energy || 0} />
        </div>
      </div>

      {/* ─── CONSTRUIR EDIFÍCIO ──────────────────────────── */}
      <div className="bg-surface-card rounded-xl p-4 border border-white/5 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <Hammer size={18} className="text-white/40" />
          <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Construir Edifício</p>
        </div>
        <div className="flex flex-col gap-2">
          <select
            value={selectedRegion}
            onChange={e => {
              console.log('📍 [EcoPage] Região selecionada:', e.target.value)
              setReg(e.target.value)
            }}
            className="input-field text-sm"
          >
            <option value="">Selecionar região...</option>
            {regions.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} · {formatNumber(r.area_km2)}km²
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={e => {
              console.log('🏗️ [EcoPage] Tipo selecionado:', e.target.value)
              setType(e.target.value)
            }}
            className="input-field text-sm"
          >
            <option value="">Selecionar edifício...</option>
            {Object.entries(grouped).map(([cat, items]) => (
              <optgroup key={cat} label={cat.toUpperCase()}>
                {items.map(b => (
                  <option key={b.type} value={b.type}>
                    {b.name} · {formatMoney(b.cost_money)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {selectedCat && (
            <div className="bg-white/5 rounded-lg p-3 text-xs text-white/60 grid grid-cols-2 gap-1">
              <span>Área: {selectedCat.area_km2}km²/un</span>
              <span>Construção: {selectedCat.build_time_min}min</span>
              <span>Manutenção: {formatMoney(selectedCat.maint_money)}/ciclo</span>
              <span>Lucro: {formatMoney(selectedCat.profit_money)}/ciclo</span>
              {selectedCat.produces && <span>Produz: {selectedCat.produces_qty} {selectedCat.produces}/ciclo</span>}
              {selectedCat.energy_produces > 0 && <span>Gera: {selectedCat.energy_produces} energia</span>}
              {selectedCat.energy_cost > 0 && <span>Consome: {selectedCat.energy_cost} energia</span>}
            </div>
          )}

          <div className="flex gap-2 mt-1">
            <input
              type="number"
              min={1}
              value={qty}
              onChange={e => setQty(Number(e.target.value))}
              className="input-field w-20 text-sm"
              placeholder="Qtd"
            />
            <button
              onClick={handleBuild}
              disabled={!selectedRegion || !selectedType || submitting}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-30 text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
            >
              {submitting ? 'Construindo...' : 'CONSTRUIR'}
            </button>
          </div>

          {feedback && (
            <p className={`text-sm mt-1 ${feedback.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>
              {feedback}
            </p>
          )}
        </div>

        {/* ─── EDIFÍCIOS EM CONSTRUÇÃO ──────────────────────── */}
        {buildings.filter(b => !b.is_built).length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-white/40 mb-1">Em construção</p>
            {buildings
              .filter(b => !b.is_built)
              .slice(0, 5)
              .map(b => {
                const buildTimeMin = b.building_catalog?.build_time_min || 30
                const totalMs = buildTimeMin * 60 * 1000
                const elapsed = Date.now() - new Date(b.started_at).getTime()
                const progress = Math.min(100, (elapsed / totalMs) * 100)
                const remaining = Math.max(0, totalMs - elapsed)

                return (
                  <div key={b.id} className="bg-white/5 rounded-lg p-2.5 mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white/70 text-sm">
                        {b.building_catalog?.name || 'Edifício'}
                      </span>
                      <span className="text-white/30 text-xs">
                        {remaining > 0 ? formatTime(new Date(Date.now() + remaining).toISOString()) : 'Concluído'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* ─── PRODUZIR EQUIPAMENTO ──────────────────────────── */}
      <div className="bg-surface-card rounded-xl p-4 border border-white/5 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <Package size={18} className="text-white/40" />
          <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Produzir Equipamento</p>
        </div>
        <div className="flex flex-col gap-2">
          <select
            value={prodUnit}
            onChange={e => {
              console.log('⚔️ [EcoPage] Unidade selecionada:', e.target.value)
              setProdUnit(e.target.value)
            }}
            className="input-field text-sm"
          >
            <option value="">Selecionar equipamento...</option>
            {UNITS.map(u => (
              <option key={u.key} value={u.key}>
                {u.emoji} {u.label} ({formatMoney(u.cost)})
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={prodQty}
              onChange={e => setProdQty(Number(e.target.value))}
              className="input-field w-20 text-sm"
              placeholder="Qtd"
            />
            <button
              onClick={handleProduce}
              disabled={!prodUnit || prodSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
            >
              {prodSubmitting ? 'Produzindo...' : 'PRODUZIR'}
            </button>
          </div>

          {prodFeedback && (
            <p className={`text-sm mt-1 ${prodFeedback.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>
              {prodFeedback}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Resource({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-white/40 text-[8px] uppercase">{label}</p>
      <p className="text-white font-bold text-sm">{formatNumber(value)}</p>
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}