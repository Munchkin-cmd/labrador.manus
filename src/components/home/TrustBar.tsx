'use client'

interface Props {
  trust: number
  label?: string
  color?: string
}

export default function TrustBar({ trust, label = 'Confiança', color = 'bg-green-500' }: Props) {
  const pct = Math.max(0, Math.min(100, trust))

  return (
    <div className="flex items-center gap-3">
      
      {/* ✅ Label formatada com fonte mono, caixa alta e mais espaço */}
      <span className="text-white/50 text-[10px] font-mono font-bold uppercase tracking-widest w-24 flex-shrink-0">
        {label}
      </span>
      
      {/* ✅ Fundo da barra sólido, com borda azul e cantos quadrados (menos arredondados) */}
      <div className="flex-1 h-2.5 rounded-sm bg-surface-input border border-surface-border overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-sm transition-all duration-700 ${color} shadow-[0_0_8px_rgba(255,255,255,0.3)]`}
          style={{ width: `${pct}%` }}
        />
      </div>
      
      {/* ✅ Texto da porcentagem em destaque, fonte mono e alinhado à direita */}
      <span className="text-white font-bold font-mono text-xs w-10 text-right">
        {pct}%
      </span>
    </div>
  )
}