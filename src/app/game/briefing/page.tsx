'use client'

import { useState } from 'react'
import { useBriefing } from '@/hooks/useMenu'
import { formatTime } from '@/utils/format'
import { CheckCircle2, Check, X } from 'lucide-react'

// ✅ Cores dos cards mantidas, e novo tipo 'message' adicionado
const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  war:      { emoji: '⚔️', color: 'border-red-500/30 bg-red-500/10 text-red-400' },
  alliance: { emoji: '🤝', color: 'border-green-500/30 bg-green-500/10 text-green-400' },
  embargo:  { emoji: '🚢', color: 'border-orange-500/30 bg-orange-500/10 text-orange-400' },
  sanction: { emoji: '🚫', color: 'border-orange-400/30 bg-orange-400/10 text-orange-300' },
  market:   { emoji: '📦', color: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  system:   { emoji: '⚙️', color: 'border-surface-border bg-surface-input text-white/80' },
  article:  { emoji: '📰', color: 'border-purple-500/30 bg-purple-500/10 text-purple-400' },
  law:      { emoji: '⚖️', color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' },
  sabotage: { emoji: '🕵️', color: 'border-red-400/30 bg-red-400/10 text-red-300' },
  diplomacy: { emoji: '📨', color: 'border-blue-400/30 bg-blue-400/10 text-blue-300' },
  message:   { emoji: '✉️', color: 'border-blue-400/30 bg-blue-400/10 text-blue-300' }, // ✅ NOVO TIPO AQUI
}

export default function BriefingPage() {
  const { notifications, loading, markRead, markAllRead, handleProposalAction } = useBriefing()
  
  const [processingId, setProcessingId] = useState<string | null>(null)

  const unread = notifications.filter(n => !n.is_read).length

  const handleAction = async (e: React.MouseEvent, notification: any, action: 'accept' | 'reject') => {
    e.stopPropagation()
    setProcessingId(notification.id)

    const result = await handleProposalAction(notification.id, action)
    
    setProcessingId(null)

    if (result.success) {
      window.location.reload()
    } else {
      alert(result.error || 'Erro ao processar proposta')
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-24 min-h-screen w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          <div>
            <p className="text-xs font-bold tracking-widest text-white uppercase font-mono">Briefing</p>
            {unread > 0 && (
              <p className="text-primary text-[10px] mt-0.5 font-bold font-mono uppercase tracking-widest">
                {unread} não lida{unread > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-white/40 text-[10px] font-bold font-mono uppercase tracking-widest hover:text-white transition-colors"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Notifications */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-surface-card border border-surface-border rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="text-center py-16 bg-surface-card border border-surface-border rounded-xl mt-4">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-white/40 text-xs font-mono uppercase tracking-widest">Nenhuma notificação</p>
        </div>
      )}

      {notifications.map(n => {
        const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system
        const isRead = n.is_read

        return (
          <div
            key={n.id}
            onClick={() => !isRead && n.type !== 'diplomacy' && markRead(n.id)}
            className={`border rounded-xl p-4 transition-all duration-300 ${
              isRead
                ? 'opacity-50 border-surface-border bg-surface-card grayscale-[40%]'
                : 'opacity-100 border-primary bg-primary/10 shadow-lg hover:border-primary/80'
            } ${cfg.color}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0 mt-0.5">{cfg.emoji}</span>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className={`font-bold text-xs uppercase tracking-wider truncate ${isRead ? 'text-white/70' : 'text-white'}`}>
                    {n.title}
                  </p>
                  <span className="text-white/30 text-[10px] font-mono flex-shrink-0">{formatTime(n.created_at)}</span>
                </div>
                
                <p className={`text-xs leading-relaxed ${isRead ? 'text-white/40' : 'text-white/80'}`}>
                  {n.message}
                </p>

                {/* ✅ BOTÕES DE AÇÃO (Só aparecem para propostas 'diplomacy', não para 'message') */}
                {n.type === 'diplomacy' && !isRead && (
                  <div className="flex gap-3 mt-4 pt-3 border-t border-surface-border/50">
                    <button
                      onClick={(e) => handleAction(e, n, 'accept')}
                      disabled={processingId === n.id}
                      className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 font-bold py-2 rounded-md text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {processingId === n.id ? 'Processando...' : <><Check size={14} /> Aceitar</>}
                    </button>
                    <button
                      onClick={(e) => handleAction(e, n, 'reject')}
                      disabled={processingId === n.id}
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2 rounded-md text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {processingId === n.id ? 'Processando...' : <><X size={14} /> Recusar</>}
                    </button>
                  </div>
                )}
              </div>
              
              {!isRead && n.type !== 'diplomacy' && (
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              )}
              {isRead && (
                <CheckCircle2 size={16} className="text-white/20 flex-shrink-0 mt-1.5" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}