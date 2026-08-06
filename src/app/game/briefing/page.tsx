'use client'

import { useBriefing } from '@/hooks/useMenu'
import { formatTime } from '@/utils/format'

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
  diplomacy: { emoji: '📨', color: 'border-blue-400/40 bg-blue-400/5' }, // ✅ ADICIONE ESTA LINHA
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
            <p className="text-primary-light text-xs mt-0.5">{unread} não lida{unread > 1 ? 's' : ''}</p>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-white/40 text-xs hover:text-white/70 transition-colors">
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Notifications */}
      {loading && (
        <div className="flex flex-col gap-2">
          {[1,2,3].map(i => (
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
        return (
          <div
            key={n.id}
            onClick={() => !n.is_read && markRead(n.id)}
            className={`border rounded-xl p-3 cursor-pointer transition-opacity ${cfg.color}
                        ${n.is_read ? 'opacity-50' : 'opacity-100'}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-xl flex-shrink-0">{cfg.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white font-semibold text-sm truncate">{n.title}</p>
                  <span className="text-white/30 text-xs flex-shrink-0">{formatTime(n.created_at)}</span>
                </div>
                <p className="text-white/60 text-xs mt-0.5 leading-snug">{n.message}</p>
              </div>
              {!n.is_read && (
                <div className="w-2 h-2 rounded-full bg-primary-light flex-shrink-0 mt-1" />
              )}
            </div>
          </div>
        )
      })}

    </div>
  )
}