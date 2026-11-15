'use client'

interface Props {
  trust: number // Mantido o nome original para não quebrar as importações
  label?: string
  color?: string // Cor opcional (se não for passada, usa a automática)
}

export default function TrustBar({ trust, label = 'Governabilidade', color }: Props) {
  // Garante que o valor fique entre 0 e 100
  const pct = Math.max(0, Math.min(100, trust))

  // ✅ Define a cor e o brilho dinamicamente baseado na porcentagem
  const getBarStyles = () => {
    if (color) return `${color} shadow-[0_0_8px_rgba(255,255,255,0.3)]` // Se passou cor customizada
    if (pct >= 70) return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
    if (pct >= 40) return 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'
    return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
  }

  return (
    <div className="flex items-center gap-3 w-full">
      
      {/* Label formatada */}
      <span className="text-white/50 text-[10px] font-mono font-bold uppercase tracking-widest w-28 flex-shrink-0 truncate">
        {label}
      </span>
      
      {/* Container da Barra */}
      <div className="flex-1 h-2.5 rounded-sm bg-black/40 border border-surface-border overflow-hidden shadow-inner relative">
        {/* Preenchimento animado */}
        <div
          className={`h-full rounded-sm transition-all duration-700 ease-out ${getBarStyles()}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      
      {/* Texto da porcentagem */}
      <span className={`font-bold font-mono text-xs w-10 text-right transition-colors ${
        pct >= 70 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'
      }`}>
        {pct}%
      </span>
      
    </div>
  )
}