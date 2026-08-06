'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useFeed } from '@/hooks/useFeed'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatTime } from '@/utils/format'
import { ArrowLeft, Trash2, Pencil, Image, X, AlertCircle, CheckCircle } from 'lucide-react'

// ─── GIPHY SDK ──────────────────────────────────────────────
import { GiphyFetch } from '@giphy/js-fetch-api'
import { Grid } from '@giphy/react-components'

const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY || '')

export default function ArtigoPage() {
  const params = useParams()
  const router = useRouter()
  const { user, country } = useAuthStore()
  const { voteArticle, fetchComments, postComment } = useFeed()
  const id = params.id as string

  const [article, setArticle] = useState<any | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // ─── ESTADO PARA FEEDBACK ───────────────────────────────
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // ─── ESTADO PARA MÍDIA DO COMENTÁRIO ─────────────────────
  const [selectedMedia, setSelectedMedia] = useState<{
    url: string
    type: 'gif' | 'sticker' | 'image'
  } | null>(null)

  // ─── MODAL DE GIF ──────────────────────────────────────────
  const [showGifModal, setShowGifModal] = useState(false)
  const [gifSearch, setGifSearch] = useState('')
  const [gifTab, setGifTab] = useState<'gifs' | 'stickers'>('gifs')

  const isAuthor = article?.country_id === country?.id

  useEffect(() => {
    async function loadArticle() {
      if (!id) return
      const { data } = await supabase
        .from('articles')
        .select('*, countries(name, flag_emoji)')
        .eq('id', id)
        .single()
      setArticle(data)
      setLoading(false)
    }
    loadArticle()
  }, [id])

  useEffect(() => {
    async function loadComments() {
      const c = await fetchComments(id)
      setComments(c)
    }
    loadComments()
  }, [id, fetchComments])

  async function handleVote(vote: 1 | -1) {
    if (!article) return
    await voteArticle(article.id, vote)
    const newLikes = article.likes + (vote === 1 ? 1 : -1)
    const newDislikes = article.dislikes + (vote === -1 ? 1 : -1)
    setArticle({ ...article, likes: newLikes, dislikes: newDislikes })
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este artigo?')) return
    setDeleting(true)
    const { error } = await supabase.from('articles').delete().eq('id', id)
    if (!error) {
      router.push('/game/feed')
    } else {
      alert('Erro ao excluir o artigo.')
    }
    setDeleting(false)
  }

  // ─── ENVIAR COMENTÁRIO ──────────────────────────────────────
  async function handleComment() {
    console.log('💬 [ArtigoPage] handleComment() chamado')
    
    if (!reply.trim() && !selectedMedia) {
      console.warn('⚠️ [ArtigoPage] Comentário vazio e sem mídia')
      setFeedback({
        type: 'error',
        message: 'Escreva algo ou adicione uma mídia',
      })
      return
    }

    setSending(true)
    setFeedback(null)

    const mediaData = selectedMedia
      ? {
          gif_url: selectedMedia.type === 'gif' ? selectedMedia.url : undefined,
          sticker_url: selectedMedia.type === 'sticker' ? selectedMedia.url : undefined,
          image_url: selectedMedia.type === 'image' ? selectedMedia.url : undefined,
        }
      : undefined

    console.log('📤 [ArtigoPage] Enviando comentário:', { id, content: reply.trim(), mediaData })

    // ✅ CAPTURA O RETORNO
    const result = await postComment(id, reply.trim(), undefined, mediaData)
    
    console.log('📢 [ArtigoPage] Resultado de postComment:', result)

    if (result.success) {
      console.log('✅ [ArtigoPage] Comentário enviado com sucesso')
      
      // Limpa apenas se funcionou
      setReply('')
      setSelectedMedia(null)
      
      // Recarrega comentários
      const c = await fetchComments(id)
      setComments(c)
      console.log('🔄 [ArtigoPage] Comentários atualizados:', c.length)

      setFeedback({
        type: 'success',
        message: 'Comentário postado com sucesso! 🎉',
      })
    } else {
      console.error('❌ [ArtigoPage] Erro ao postar:', result.error)
      
      setFeedback({
        type: 'error',
        message: result.error || 'Erro ao postar comentário',
      })
    }

    setSending(false)

    // Limpa feedback após 3 segundos
    setTimeout(() => setFeedback(null), 3000)
  }

  // ─── SELECIONAR GIF ──────────────────────────────────────────
  const selectGif = (url: string, type: 'gif' | 'sticker') => {
    console.log('🎨 [ArtigoPage] GIF selecionado:', { url, type })
    setSelectedMedia({ url, type })
    setShowGifModal(false)
    setGifSearch('')
  }

  if (loading)
    return <div className="p-8 text-center text-white/40">Carregando artigo...</div>
  if (!article)
    return <div className="p-8 text-center text-white/40">Artigo não encontrado.</div>

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <div className="flex items-center gap-3">
          <Link
            href="/game/feed"
            className="text-white/50 hover:text-white transition-colors p-2 -ml-2"
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-white">Artigo</h1>
        </div>
        {isAuthor && (
          <div className="flex gap-2">
            <Link
              href={`/game/feed/editar/${id}`}
              className="p-2 text-white/50 hover:text-white transition-colors"
            >
              <Pencil size={20} />
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo do artigo */}
      <div className="bg-surface-card rounded-xl p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{article.countries?.flag_emoji ?? '🌐'}</span>
          <span className="text-white/70 text-sm font-semibold">
            {article.countries?.name}
          </span>
          <span className="text-white/30 text-xs">{formatTime(article.created_at)}</span>
          <span className="ml-auto text-xs bg-white/10 text-white/50 rounded-full px-2 py-0.5">
            {article.category}
          </span>
        </div>
        <h2 className="text-white font-black text-2xl leading-snug mb-4">{article.title}</h2>
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
        </div>
        <div className="flex gap-4 mt-6 pt-4 border-t border-white/5">
          <button
            onClick={() => handleVote(1)}
            className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
              article.user_vote === 1
                ? 'text-green-400'
                : 'text-white/40 hover:text-green-400'
            }`}
          >
            👍 <span>{article.likes}</span>
          </button>

          <button
            onClick={() => handleVote(-1)}
            className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
              article.user_vote === -1 ? 'text-red-400' : 'text-white/40 hover:text-red-400'
            }`}
          >
            👎 <span>{article.dislikes}</span>
          </button>
        </div>
      </div>

      {/* ─── COMENTÁRIOS ────────────────────────────────────── */}
      <div className="mt-6 bg-surface-card rounded-xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase">
            COMENTÁRIOS
          </h3>
          <button
            onClick={() => setShowGifModal(true)}
            className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
          >
            <Image size={14} /> GIF
          </button>
        </div>

        {comments.length === 0 && (
          <p className="text-white/20 text-sm text-center">Sem comentários ainda.</p>
        )}

        {comments.map((c: any) => (
          <div key={c.id} className="flex gap-2 py-2 border-b border-white/5 last:border-0">
            <span className="text-base flex-shrink-0">{c.countries?.flag_emoji ?? '🌐'}</span>
            <div className="flex-1">
              <p className="text-white/60 text-xs font-semibold">{c.countries?.name}</p>
              {c.gif_url && (
                <img src={c.gif_url} alt="GIF" className="max-w-[200px] rounded-lg mt-1" />
              )}
              {c.sticker_url && (
                <img
                  src={c.sticker_url}
                  alt="Sticker"
                  className="max-w-[100px] rounded-lg mt-1"
                />
              )}
              {c.image_url && (
                <img
                  src={c.image_url}
                  alt="Imagem"
                  className="max-w-[200px] rounded-lg mt-1"
                />
              )}
              <p className="text-white/80 text-sm mt-0.5">{c.content}</p>
            </div>
          </div>
        ))}

        {/* ─── INPUT DE COMENTÁRIO COM PREVIEW DE MÍDIA ────── */}
        <div className="mt-4 flex flex-col gap-2">
          {/* ✅ FEEDBACK DE SUCESSO/ERRO */}
          {feedback && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                feedback.type === 'success'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {selectedMedia && (
            <div className="relative bg-black/40 rounded-lg overflow-hidden max-h-32 max-w-full">
              <img
                src={selectedMedia.url}
                alt="Mídia"
                className="w-full h-full object-contain max-h-32"
              />
              <button
                onClick={() => setSelectedMedia(null)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !sending && handleComment()}
              placeholder="Comentar..."
              disabled={sending}
              className="flex-1 input-field py-2 text-sm disabled:opacity-50"
            />
            <button
              onClick={handleComment}
              disabled={sending || (!reply.trim() && !selectedMedia)}
              className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-30"
            >
              {sending ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL DE GIF (GIPHY SDK) ────────────────────────── */}
      {showGifModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">🎨 Escolher GIF ou Sticker</h3>
              <button
                onClick={() => setShowGifModal(false)}
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setGifTab('gifs')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  gifTab === 'gifs'
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-white/40 hover:text-white/60'
                }`}
              >
                GIFs
              </button>
              <button
                onClick={() => setGifTab('stickers')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  gifTab === 'stickers'
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-white/40 hover:text-white/60'
                }`}
              >
                Stickers
              </button>
            </div>

            <div className="h-80 overflow-y-auto -mx-2 px-2">
              <Grid
                key={gifTab + gifSearch}
                fetchGifs={(offset) => {
                  const searchTerm = gifSearch || 'funny'
                  if (gifTab === 'stickers') {
                    return gf.search(searchTerm, { offset, limit: 20, type: 'stickers' })
                  }
                  return gf.search(searchTerm, { offset, limit: 20 })
                }}
                columns={3}
                gutter={6}
                width={320}
                onGifClick={(gif: any, e: any) => {
                  e.preventDefault()
                  selectGif(gif.images.original.url, gifTab === 'stickers' ? 'sticker' : 'gif')
                }}
              />
            </div>

            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={gifSearch}
                onChange={(e) => setGifSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setGifTab(gifTab)}
                placeholder="Buscar GIF..."
                className="flex-1 bg-[#0a0a0a] border border-white/10 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}