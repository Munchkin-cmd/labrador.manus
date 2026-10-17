'use client'

import Link from 'next/link'
import { useFeed, CATEGORIES, Article } from '@/hooks/useFeed'
import { formatTime } from '@/utils/format'

export default function FeedPage() {
  const { articles, loading, hasMore, loadMore, voteArticle } = useFeed()

  return (
    <div className="flex flex-col pb-6 min-h-screen">

      {/* Header da aba */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase">FEED GLOBAL</p>
      </div>

      {/* Lista de artigos */}
      <div className="flex flex-col gap-3 px-4">
        {loading && articles.length === 0 && (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => <ArticleSkeleton key={i} />)}
          </div>
        )}

        {articles.map(article => (
          <ArticleCard
            key={article.id}
            article={article}
            onVote={voteArticle}
          />
        ))}

        {hasMore && (
          <button onClick={loadMore} disabled={loading}
            className="text-white/40 text-sm text-center py-3 hover:text-white/60 transition-colors">
            {loading ? 'Carregando...' : 'Carregar mais...'}
          </button>
        )}

        {!loading && articles.length === 0 && (
          <div className="text-center py-16 text-white/30">
            <p className="text-4xl mb-3">📰</p>
            <p className="text-sm">Nenhum artigo publicado ainda.</p>
            <p className="text-xs mt-1">Seja o primeiro!</p>
          </div>
        )}
      </div>

      {/* FAB - REDIRECIONA PARA A PÁGINA SEPARADA */}
      <Link
        href="/game/feed/novo-artigo"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary shadow-lg
                   flex items-center justify-center text-2xl text-white z-30
                   hover:bg-primary-light transition-colors active:scale-95"
      >
        +
      </Link>
    </div>
  )
}

// ── Article Card ─────────────────────────────────────────────
function ArticleCard({ article, onVote }: {
  article: Article
  onVote: (id: string, v: 1 | -1) => void
}) {
  // ✅ Limpa as tags HTML do conteúdo para exibir um texto limpo na prévia do feed
  const cleanPreview = article.content?.replace(/<[^>]*>?/gm, '') || ''

  return (
    <div className="bg-surface-card rounded-xl p-4 flex flex-col gap-3 border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-xl">{article.countries?.flag_emoji ?? '🌐'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white/70 text-xs font-semibold truncate">{article.countries?.name}</p>
          <p className="text-white/30 text-xs">{formatTime(article.created_at)}</p>
        </div>
        <span className="text-xs bg-white/10 text-white/50 rounded-full px-2 py-0.5">{article.category}</span>
      </div>

      {/* ✅ Link sem erros de HTML (só texto puro aqui dentro) */}
      <Link href={`/game/feed/${article.id}`} className="block text-left group">
        <h3 className="text-white font-bold text-base leading-snug line-clamp-2 group-hover:text-primary-light transition-colors">
          {article.title}
        </h3>
        <p className="text-white/50 text-sm mt-1 line-clamp-2">
          {cleanPreview}
        </p>
      </Link>

      <div className="flex items-center gap-3 pt-2 border-t border-white/5">
        <button
          onClick={() => onVote(article.id, 1)}
          className={`flex items-center gap-1.5 text-sm font-semibold transition-colors
            ${article.user_vote === 1 ? 'text-green-400' : 'text-white/40 hover:text-green-400'}`}
        >
          👍 <span>{article.likes}</span>
        </button>
        <button
          onClick={() => onVote(article.id, -1)}
          className={`flex items-center gap-1.5 text-sm font-semibold transition-colors
            ${article.user_vote === -1 ? 'text-red-400' : 'text-white/40 hover:text-red-400'}`}
        >
          👎 <span>{article.dislikes}</span>
        </button>
        <Link
          href={`/game/feed/${article.id}`}
          className="text-white/30 text-sm ml-auto hover:text-white/60 transition-colors"
        >
          💬 Ver artigo
        </Link>
      </div>
    </div>
  )
}

function ArticleSkeleton() {
  return (
    <div className="bg-surface-card rounded-xl p-4 flex flex-col gap-3 animate-pulse border border-white/5">
      <div className="flex gap-2 items-center">
        <div className="w-8 h-8 rounded-full bg-white/10" />
        <div className="h-3 w-24 bg-white/10 rounded" />
      </div>
      <div className="h-4 w-3/4 bg-white/10 rounded" />
      <div className="h-3 w-full bg-white/5 rounded" />
    </div>
  )
}