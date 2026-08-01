'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useFeed } from '@/hooks/useFeed'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatTime } from '@/utils/format'
import { ArrowLeft, Trash2, Pencil, Image, X } from 'lucide-react'

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

  // ─── GIF MODAL ──────────────────────────────────────────
  const [showGifModal, setShowGifModal] = useState(false)
  const [gifUrl, setGifUrl] = useState('')

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

  async function handleComment() {
    if (!reply.trim()) return
    setSending(true)
    await postComment(id, reply)
    setReply('')
    const c = await fetchComments(id)
    setComments(c)
    setSending(false)
  }

  // ─── INSERIR GIF NO COMENTÁRIO ──────────────────────────
  async function insertGif() {
    if (!gifUrl.trim()) return
    setSending(true)
    // A função postComment aceita parâmetros extras: content, parentId, mediaData
    await postComment(id, `![GIF](${gifUrl})`, undefined, { gif_url: gifUrl })
    setGifUrl('')
    setShowGifModal(false)
    const c = await fetchComments(id)
    setComments(c)
    setSending(false)
  }

  if (loading) return <div className="p-8 text-center text-white/40">Carregando artigo...</div>
  if (!article) return <div className="p-8 text-center text-white/40">Artigo não encontrado.</div>

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      {/* ─── CABEÇALHO ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 pt-4">
        <div className="flex items-center gap-3">
          <Link href="/game/feed" className="text-white/50 hover:text-white transition-colors p-2 -ml-2">
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

      {/* ─── CONTEÚDO DO ARTIGO ────────────────────────── */}
      <div className="bg-surface-card rounded-xl p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{article.countries?.flag_emoji ?? '🌐'}</span>
          <span className="text-white/70 text-sm font-semibold">{article.countries?.name}</span>
          <span className="text-white/30 text-xs">{formatTime(article.created_at)}</span>
          <span className="ml-auto text-xs bg-white/10 text-white/50 rounded-full px-2 py-0.5">{article.category}</span>
        </div>

        <h2 className="text-white font-black text-2xl leading-snug mb-4">{article.title}</h2>

        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {article.content}
          </ReactMarkdown>
        </div>

        {/* Botões de voto */}
        <div className="flex gap-4 mt-6 pt-4 border-t border-white/5">
          <button
            onClick={() => handleVote(1)}
            className={`flex items-center gap-1.5 text-sm font-semibold transition-colors
              ${article.user_vote === 1 ? 'text-green-400' : 'text-white/40 hover:text-green-400'}`}
          >
            👍 <span>{article.likes}</span>
          </button>
          <button
            onClick={() => handleVote(-1)}
            className={`flex items-center gap-1.5 text-sm font-semibold transition-colors
              ${article.user_vote === -1 ? 'text-red-400' : 'text-white/40 hover:text-red-400'}`}
          >
            👎 <span>{article.dislikes}</span>
          </button>
        </div>
      </div>

      {/* ─── COMENTÁRIOS ────────────────────────────────── */}
      <div className="mt-6 bg-surface-card rounded-xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold tracking-widest text-white/40 uppercase">COMENTÁRIOS</h3>
          <button
            onClick={() => setShowGifModal(true)}
            className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
          >
            <Image size={14} /> GIF
          </button>
        </div>

        {comments.length === 0 && <p className="text-white/20 text-sm text-center">Sem comentários ainda.</p>}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2 py-2 border-b border-white/5 last:border-0">
            <span className="text-base flex-shrink-0">{c.countries?.flag_emoji ?? '🌐'}</span>
            <div className="flex-1">
              <p className="text-white/60 text-xs font-semibold">{c.countries?.name}</p>
              {c.gif_url && <img src={c.gif_url} alt="GIF" className="max-w-[200px] rounded-lg mt-1" />}
              {c.sticker_url && <img src={c.sticker_url} alt="Sticker" className="max-w-[100px] rounded-lg mt-1" />}
              <p className="text-white/80 text-sm mt-0.5">{c.content}</p>
            </div>
          </div>
        ))}

        {/* Input de comentário */}
        <div className="mt-4 flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleComment()}
            placeholder="Comentar..."
            className="flex-1 input-field py-2 text-sm"
          />
          <button
            onClick={handleComment}
            disabled={sending || !reply.trim()}
            className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-30"
          >
            ➤
          </button>
        </div>
      </div>

      {/* ─── MODAL DE GIF ───────────────────────────────── */}
      {showGifModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Inserir GIF</h3>
              <button onClick={() => setShowGifModal(false)} className="text-white/40 hover:text-white/70 transition-colors">
                <X size={20} />
              </button>
            </div>
            <input
              type="text"
              value={gifUrl}
              onChange={(e) => setGifUrl(e.target.value)}
              placeholder="URL do GIF (ex: https://media.giphy.com/...)"
              className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-primary transition-colors mb-4"
            />
            <button
              onClick={insertGif}
              disabled={!gifUrl.trim() || sending}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              Inserir GIF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}