'use client'

import { useEconomy } from '@/hooks/useMenu'
import { formatNumber, formatMoney } from '@/utils/format'

// ─── ÍCONES DA LUCIDE REACT (Economia e UI) ──────────────────
import { 
  Banknote,       // Dinheiro
  Coins,          // Ouro
  Pickaxe,        // Ferro
  Factory,        // Aço
  Droplet,        // Petróleo
  Flame,          // Carvão
  Trees,          // Madeira
  Atom,           // Urânio
  Wheat,          // Comida
  Zap             // Energia
} from 'lucide-react'

// ─── ÍCONES DO IONICONS (Equipamentos Militares) ─────────────
import { 
  IoDisc,             // Munição
  IoShield,           // Tanques
  IoAirplane,         // Aeronaves
  IoFlame,            // Artilharia
  IoBug,              // Drones
  IoRocket,           // Mísseis
  IoNuclear,          // Ogivas
  IoCog               // Helicópteros (ícone genérico de máquina militar)
} from 'react-icons/io5'

export default function ArmazemPage() {
  const { economy, military, loading } = useEconomy()
  if (loading) return <Loading />

  // ─── RECURSOS (Ícones Lucide) ──────────────────────────────
  const resources = [
    { icon: <Banknote size={20} />, label: 'Dinheiro', value: economy?.money },
    { icon: <Coins size={20} />, label: 'Ouro', value: economy?.gold },
    { icon: <Pickaxe size={20} />, label: 'Ferro', value: economy?.iron },
    { icon: <Factory size={20} />, label: 'Aço', value: economy?.steel },
    { icon: <Droplet size={20} />, label: 'Petróleo', value: economy?.oil },
    { icon: <Flame size={20} />, label: 'Carvão', value: economy?.coal },
    { icon: <Trees size={20} />, label: 'Madeira', value: economy?.wood },
    { icon: <Atom size={20} />, label: 'Urânio', value: economy?.uranium },
    { icon: <Wheat size={20} />, label: 'Comida', value: economy?.food },
    { icon: <Zap size={20} />, label: 'Energia', value: economy?.energy },
  ]

  // ─── EQUIPAMENTOS MILITARES (Ícones Ionicons) ──────────────
  const militaryItems = [
    { icon: <IoDisc size={20} />, label: 'Munição', value: military?.ammunition },
    { icon: <IoShield size={20} />, label: 'Tanques', value: military?.tanks },
    { icon: <IoAirplane size={20} />, label: 'Aeronaves', value: military?.aircraft },
    { icon: <IoFlame size={20} />, label: 'Artilharia', value: military?.artillery },
    { icon: <IoCog size={20} />, label: 'Helicópteros', value: military?.helicopters },
    { icon: <IoBug size={20} />, label: 'Drones', value: military?.drones },
    { icon: <IoRocket size={20} />, label: 'Mísseis', value: military?.missiles },
    { icon: <IoNuclear size={20} />, label: 'Ogivas', value: military?.warheads },
  ]

  return (
    // ✅ Adicionado limite de largura (max-w-4xl) e margens consistentes com o resto do jogo
    <div className="flex flex-col gap-6 pb-24 min-h-screen w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6">
      
      {/* Cabeçalho estilo jogo */}
      <div className="flex items-center gap-2 mb-2 pl-1">
        <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
        <p className="text-xs font-bold tracking-widest text-white uppercase font-mono">
          ARMAZÉM
        </p>
      </div>

      {/* ─── RECURSOS ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3 pl-1">
          <div className="w-1 h-3 bg-primary/60 rounded-full" />
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest font-mono">
            RECURSOS
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {resources.map((item) => (
            <ItemCard key={item.label} {...item} />
          ))}
        </div>
      </div>

      {/* ─── EQUIPAMENTOS MILITARES ────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3 pl-1">
          <div className="w-1 h-3 bg-primary/60 rounded-full" />
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest font-mono">
            EQUIPAMENTOS MILITARES
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {militaryItems.map((item) => (
            <ItemCard key={item.label} {...item} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── COMPONENTE DO CARTÃO (ESTILO DARK TECH) ───────────
function ItemCard({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number }) {
  // Formatação: Dinheiro usa Money, outros usam Number
  const displayValue = label === 'Dinheiro'
    ? formatMoney(Number(value ?? 0))
    : formatNumber(Number(value ?? 0))

  return (
    // ✅ Fundo azul sólido (bg-surface-card), borda nítida (border-surface-border) e hover com azul
    <div className="bg-surface-card border border-surface-border rounded-lg p-3.5 flex flex-col gap-1 shadow-lg hover:border-primary/40 transition-colors group">
      
      {/* Linha superior: Ícone + Nome */}
      <div className="flex items-center justify-between">
        <span className="text-primary/70 group-hover:text-primary transition-colors">{icon}</span>
        <span className="text-[9px] font-bold font-mono uppercase text-white/50 tracking-widest">
          {label}
        </span>
      </div>
      
      {/* Linha divisória (traço) */}
      <div className="h-px bg-surface-border my-1.5 w-full" />
      
      {/* Linha inferior: Valor alinhado à direita */}
      <div className="flex justify-end pt-0.5">
        <span className="text-sm font-bold font-mono text-white tracking-wider">
          {displayValue}
        </span>
      </div>
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