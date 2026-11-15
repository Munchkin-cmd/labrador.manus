'use client'

import { useState, useEffect } from 'react'
import { useEco } from '@/hooks/useEco'
import { formatMoney, formatNumber } from '@/utils/format'
import {
  IoPeople,
  IoTimeOutline,
  IoWarning,
  IoFlash,
  IoStatsChart,
  IoTrendingUp,
} from 'react-icons/io5'

const TERRAIN_RESOURCES: Record<string, string[]> = {
  planicie: ['Madeira', 'Petróleo', 'Carvão'],
  orogenico: ['Ouro', 'Ferro', 'Urânio'],
  extremista: ['Petróleo', 'Urânio'],
  anfibio: ['Madeira', 'Ouro', 'Petróleo'],
}

export default function EcoPage() {
  const { economy, buildings, countryData, loading, refetch } = useEco()
  const [timeLeft, setTimeLeft] = useState('15:00')

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const secondsIntoHour = now.getMinutes() * 60 + now.getSeconds()
      const cycleDuration = 15 * 60 
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

  const paralyzedBuildings = buildings.filter((b: any) => b.is_paralyzed === true)
  const hasParalyzedBuildings = paralyzedBuildings.length > 0
  const hasParalyzedPowerPlants = paralyzedBuildings.some((b: any) => b.building_catalog?.produces === 'energy')

  const terrainResources = TERRAIN_RESOURCES[countryData.terrain?.toLowerCase() || 'planicie'] || []

  const globalPollution = Number((economy as any).pollution || 0)
  const globalInflation = Number((economy as any).inflation || 0)
  const pollutionPenalty = Math.max(0.1, 1 - (globalPollution * 0.001))

  return (
    // ✅ pt-24 para não sobrepor o header
    <div className="flex flex-col gap-6 pb-10 px-4 sm:px-6 pt-68 max-w-5xl mx-auto w-full relative">
      
      {/* TÍTULO DA PÁGINA */}
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-2">
          <IoStatsChart className="text-primary" /> Economia Nacional
        </h1>
        <p className="text-white/50 text-sm mt-1">Visão geral dos seus recursos e finanças.</p>
      </div>

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

        {/* INDICADORES */}
        <div className="col-span-3 sm:col-span-5 grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-surface-border">
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
            <p className={`text-xs font-bold mt-1 font-mono ${globalInflation > 10 ? 'text-red-400' : 'text-yellow-400'}`}>
              {globalInflation.toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-2 bg-surface-input border border-surface-border rounded-lg">
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider flex items-center justify-center gap-1">
              <IoWarning size={10} /> Poluição
            </p>
            <p className={`text-xs font-bold mt-1 font-mono ${globalPollution > 50 ? 'text-red-400' : 'text-white'}`}>
              {globalPollution.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* ALERTAS GLOBAIS */}
      {hasParalyzedBuildings && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-[11px] font-mono font-bold uppercase tracking-widest text-center flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse">
          <IoWarning size={18} />
          ALERTA: VOCÊ TEM {paralyzedBuildings.length} EDIFÍCIOS PARALISADOS!
        </div>
      )}
      {hasParalyzedPowerPlants && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-3 rounded-lg text-[11px] font-mono font-bold uppercase tracking-widest text-center flex items-center justify-center gap-2">
          <IoFlash size={18} />
          AVISO: USINAS PARALISADAS NÃO ESTÃO GERANDO ENERGIA!
        </div>
      )}
      
      {globalPollution > 0 && (
        <div className={`p-3 rounded-lg text-[11px] font-mono font-bold uppercase tracking-widest text-center flex items-center justify-center gap-2 border ${globalPollution > 50 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'}`}>
          <IoWarning size={18} />
          A poluição está reduzindo sua produção e lucro em {(100 - (pollutionPenalty * 100)).toFixed(1)}%.
        </div>
      )}

      {/* INFORMAÇÕES DO TERRENO */}
      <div className="bg-surface-input border border-surface-border rounded-lg p-4">
        <p className="text-xs font-bold text-white mb-1 uppercase tracking-widest">
          TERRENO NACIONAL: <span className="text-primary">{countryData.terrain || 'Desconhecido'}</span>
        </p>
        <p className="text-[10px] text-white/50 font-mono">
          ✨ Recursos disponíveis para exploração: <span className="text-white/80 font-semibold">{terrainResources.join(', ')}</span>
        </p>
      </div>

      {/* AVISO DE REDIRECIONAMENTO */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center mt-4">
        <p className="text-white/80 text-sm">
          Para construir novos edifícios ou gerenciar suas cidades, acesse a aba <strong className="text-primary">Regiões</strong> no menu lateral.
        </p>
      </div>

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