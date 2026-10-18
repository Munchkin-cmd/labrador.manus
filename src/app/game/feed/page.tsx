'use client'

import Link from 'next/link'
import { useFeed, CATEGORIES, Article } from '@/hooks/useFeed'
import { formatTime } from '@/utils/format'

// ✅ Função mágica que limpa HTML e símbolos do Markdown
function createCleanPreview(content: string) {
  if (!content) return ''
  return content
    .replace(/<[^>]*>?/gm, '') // Remove HTML
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Transforma [Texto](link) em apenas Texto
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove imagens do markdown
    .replace(/[*_~#`>]/g, '') // Remove asteriscos, underlines, cerquilhas, etc
    .replace(/https?:\/\/\S+/g, '') // Remove links soltos
    .replace(/\s+/g, ' ') // Junta espaços em branco
    .trim()
}

export default function FeedPage() {
  const { articles, loading, hasMore, loadMore, voteArticle } = useFeed()

  return (
    // ✅ Adicionado limites de largura e alinhamento central
    <div className="flex flex-col pb-24 min-h-screen w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6">
      
      {/* HEADER DO FEED */}
      <div className="flex items-center gap-2 mb-6 pl-1">
        <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
        <p className="text-xs font-bold tracking-widest text-white uppercase">Feed Global</p>
      </div>

      <div className="flex flex-col gap-4">
        {loading && articles.length === 0 && (
          <div className="flex flex-col gap-4">
            {[1,2,3].map(i => <ArticleSkeleton key={i} />)}
          </div>
        )}

        {articles.map(article => (
          <ArticleCard key={article.id} article={article} onVote={voteArticle} />
        ))}

        {hasMore && (
          <button onClick={loadMore} disabled={loading}
            className="text-white/50 text-xs font-mono uppercase tracking-widest text-center py-4 hover:text-primary transition-colors bg-surface-card border border-surface-border rounded-lg mt-2">
            {loading ? 'Carregando...' : 'Carregar mais...'}
          </button>
        )}

        {!loading && articles.length === 0 && (
          <div className="text-center py-16 text-white/30 bg-surface-card border border-surface-border rounded-xl">
            <p className="text-4xl mb-3">📰</p>
            <p className="text-sm font-mono uppercase tracking-widest">Nenhum artigo publicado ainda.</p>
            <p className="text-[10px] mt-2 font-mono opacity-60">Seja o primeiro a publicar!</p>
          </div>
        )}
      </div>

      {/* BOTÃO FLUTUANTE (FAB) */}
      <Link
        href="/game/feed/novo-artigo"
        className="fixed bottom-20 right-4 sm:right-[max(1rem,calc(50vw-20rem))] w-14 h-14 rounded-full bg-primary shadow-[0_0_20px_rgba(59,130,246,0.4)]
                   flex items-center justify-center text-2xl text-white z-30 font-light
                   hover:bg-primary-dark transition-all active:scale-95 border border-primary/50"
      >
        +
      </Link>
    </div>
  )
}

function ArticleCard({ article, onVote }: {
  article: Article
  onVote: (id: string, v: 1 | -1) => void
}) {
  const cleanPreview = createCleanPreview(article.content || '')

  // ✅ Pegando a flag_url da tabela users
  const userData = article.countries?.users;
  const flagUrl = Array.isArray(userData) ? userData[0]?.flag_url : userData?.flag_url;

  return (
    // ✅ Card Sólido com borda fina (Dark Tech)
    <div className="bg-surface-card rounded-xl p-4 flex flex-col gap-3 border border-surface-border hover:border-primary/40 transition-colors shadow-lg group">
      
      {/* CABEÇALHO DO CARD */}
      <div className="flex items-center gap-3">
        
        {/* AVATAR DA BANDEIRA */}
        <div className="w-9 h-9 rounded-full overflow-hidden border border-surface-border shrink-0 flex items-center justify-center bg-surface-input">
          {flagUrl ? (
            <img 
              src={flagUrl} 
              alt={article.countries?.name || 'Bandeira'} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <span className="text-lg leading-none">{article.countries?.flag_emoji ?? '🌐'}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold uppercase tracking-wider truncate">{article.countries?.name}</p>
          <p className="text-white/40 text-[10px] font-mono mt-0.5">{formatTime(article.created_at)}</p>
        </div>
        
        {/* TAG DA CATEGORIA */}
        <span className="text-[10px] font-bold font-mono tracking-widest uppercase bg-surface-input border border-surface-border text-primary rounded px-2 py-1">
          {article.category}
        </span>
      </div>

      {/* CONTEÚDO */}
      <Link href={`/game/feed/${article.id}`} className="block text-left">
        <h3 className="text-white font-bold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        <p className="text-white/60 text-sm mt-2 line-clamp-2">
          {cleanPreview}
        </p>
      </Link>

      {/* RODAPÉ DE AÇÕES */}
      <div className="flex items-center gap-4 pt-3 border-t border-surface-border mt-1">
        <button
          onClick={() => onVote(article.id, 1)}
          className={`flex items-center gap-1.5 text-xs font-bold font-mono transition-colors
            ${article.user_vote === 1 ? 'text-green-400' : 'text-white/40 hover:text-green-400'}`}
        >
          👍 <span>{article.likes}</span>
        </button>
        <button
          onClick={() => onVote(article.id, -1)}
          className={`flex items-center gap-1.5 text-xs font-bold font-mono transition-colors
            ${article.user_vote === -1 ? 'text-red-400' : 'text-white/40 hover:text-red-400'}`}
        >
          👎 <span>{article.dislikes}</span>
        </button>
        <Link
          href={`/game/feed/${article.id}`}
          className="text-primary/70 text-[10px] font-bold font-mono uppercase tracking-widest ml-auto hover:text-primary transition-colors flex items-center gap-1"
        >
          Ver Artigo <span>→</span>
        </Link>
      </div>
    </div>
  )
}

function ArticleSkeleton() {
  return (
    <div className="bg-surface-card rounded-xl p-4 flex flex-col gap-3 animate-pulse border border-surface-border">
      <div className="flex gap-3 items-center">
        <div className="w-9 h-9 rounded-full bg-surface-input" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 bg-surface-input rounded" />
          <div className="h-2 w-16 bg-surface-input rounded" />
        </div>
      </div>
      <div className="h-5 w-3/4 bg-surface-input rounded mt-2" />
      <div className="h-3 w-full bg-surface-input rounded" />
      <div className="h-3 w-2/3 bg-surface-input rounded" />
      <div className="h-px bg-surface-border mt-2" />
    </div>
  )
}