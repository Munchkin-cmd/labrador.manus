'use client'

import { useState } from 'react'
import { useBriefing } from '@/hooks/useMenu'
import { formatTime } from '@/utils/format'
import { CheckCircle2, Check, X } from 'lucide-react'

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  war:      { emoji: '⚔️', color: 'border-red-500/40 bg-red-500/5' },
  alliance: { emoji: '🤝', color: 'border-green-500/40 bg-green-500/5' },
  embargo:  { emoji: '🚢', color: 'border-orange-500/40 bg-orange-500/5' },
  sanction: { emoji: '🚫', color: 'border-orange-400/40 bg-orange-400/5' },
  market:   { emoji: '📦', color: 'border-blue-500/40 bg-blue-500/5' },
  system:   { emoji: '⚙️', color: 'border-white/20 bg-white/5' },
  article:  { emoji: '📰', color: 'border-purple-500/40 bg-purple-500/5' },
  law:      { emoji: '⚖️', color: 'border-yellow-500/40 bg-yellow-500/5' },
  sabotage: { emoji: '🕵️', color: 'border-red-400/40 bg-red-400/5' },
  diplomacy: { emoji: '📨', color: 'border-blue-400/40 bg-blue-400/5' },
}

export default function BriefingPage() {
  // ✅ Importando a nova função handleProposalAction
  const { notifications, loading, markRead, markAllRead, handleProposalAction } = useBriefing()
  
  // Estado para controlar qual botão está carregando
  const [processingId, setProcessingId] = useState<string | null>(null)

  const unread = notifications.filter(n => !n.is_read).length

  // ✅ Função para processar o clique nos botões
  const handleAction = async (e: React.MouseEvent, notification: any, action: 'accept' | 'reject') => {
    e.stopPropagation() // Impede que o clique marque a notificação como lida sem querer
    setProcessingId(notification.id)

    // Chama a função do backend (useMenu.ts)
    const result = await handleProposalAction(notification.id, action)
    
    setProcessingId(null)

    if (result.success) {
      // Recarrega a página para atualizar as sanções e os dados na tela
      window.location.reload()
    } else {
      alert(result.error || 'Erro ao processar proposta')
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-white/40 uppercase">BRIEFING</p>
          {unread > 0 && (
            <p className="text-primary-light text-xs mt-0.5 font-semibold">
              {unread} não lida{unread > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-white/40 text-xs hover:text-white/70 transition-colors"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Notifications */}
      {loading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-surface-card rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">Nenhuma notificação</p>
        </div>
      )}

      {notifications.map(n => {
        const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system
        const isRead = n.is_read

        return (
          <div
            key={n.id}
            onClick={() => !isRead && n.type !== 'diplomacy' && markRead(n.id)}
            className={`border rounded-xl p-3 transition-all duration-300 ${
              isRead
                ? 'opacity-50 border-white/10 bg-white/5 grayscale-[30%]'
                : 'opacity-100 border-primary bg-primary/10 shadow-[0_0_12px_rgba(139,92,246,0.15)] hover:border-primary-light'
            } ${cfg.color}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-xl flex-shrink-0 mt-0.5">{cfg.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`font-semibold text-sm truncate ${isRead ? 'text-white/70' : 'text-white'}`}>
                    {n.title}
                  </p>
                  <span className="text-white/30 text-xs flex-shrink-0">{formatTime(n.created_at)}</span>
                </div>
                <p className={`text-xs mt-0.5 leading-snug ${isRead ? 'text-white/40' : 'text-white/70'}`}>
                  {n.message}
                </p>

                {/* ✅ BOTÕES DE AÇÃO PARA PROPOSTAS DE LIVRE COMÉRCIO */}
                {n.type === 'diplomacy' && !isRead && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => handleAction(e, n, 'accept')}
                      disabled={processingId === n.id}
                      className="flex-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {processingId === n.id ? 'Processando...' : <><Check size={14} /> Aceitar</>}
                    </button>
                    <button
                      onClick={(e) => handleAction(e, n, 'reject')}
                      disabled={processingId === n.id}
                      className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 font-bold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {processingId === n.id ? 'Processando...' : <><X size={14} /> Recusar</>}
                    </button>
                  </div>
                )}
              </div>
              
              {!isRead && n.type !== 'diplomacy' && (
                <div className="w-2 h-2 rounded-full bg-primary-light flex-shrink-0 mt-1.5 animate-pulse" />
              )}
              {isRead && (
                <CheckCircle2 size={16} className="text-white/20 flex-shrink-0 mt-1" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}