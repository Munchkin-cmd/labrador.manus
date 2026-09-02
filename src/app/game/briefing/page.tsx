'use client'

import { useBriefing } from '@/hooks/useMenu'
import { formatTime } from '@/utils/format'
import { CheckCircle2 } from 'lucide-react'

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
  const { notifications, loading, markRead, markAllRead } = useBriefing()

  const unread = notifications.filter(n => !n.is_read).length

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
            onClick={() => !isRead && markRead(n.id)}
            className={`border rounded-xl p-3 cursor-pointer transition-all duration-300 ${
              isRead
                ? 'opacity-50 border-white/10 bg-white/5 grayscale-[30%] hover:opacity-70'
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
              </div>
              {!isRead && (
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