'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useFeed, Comment } from '@/hooks/useFeed'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { formatTime } from '@/utils/format'
import { ArrowLeft, Trash2, Pencil, Image, X, AlertCircle, CheckCircle, FileText } from 'lucide-react'

import LinkPreview from '@/components/LinkPreview'

// ─── GIPHY SDK ──────────────────────────────────────────────
import { GiphyFetch } from '@giphy/js-fetch-api'
import { Grid } from '@giphy/react-components'

const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY || '')

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span || []), 'className', 'style'],
    u: [],
    a: [...(defaultSchema.attributes?.a || []), 'target', 'rel', 'href'],
  },
  tagNames: [...(defaultSchema.tagNames || []), 'u', 'span'],
}

function getFlagUrl(countryData: any) {
  if (!countryData?.users) return null;
  if (Array.isArray(countryData.users)) return countryData.users[0]?.flag_url;
  return countryData.users.flag_url;
}

interface CommentWithReplies extends Comment {
  replies: CommentWithReplies[]
}

export default function ArtigoPage() {
  const params = useParams()
  const router = useRouter()
  const { user, country } = useAuthStore()
  const { voteArticle, fetchComments, postComment } = useFeed()
  const id = params.id as string

  const [article, setArticle] = useState<any | null>(null)
  const [comments, setComments] = useState<CommentWithReplies[]>([])
  const [loading, setLoading] = useState(true)
  
  const [reply, setReply] = useState('')
  const [replyingTo, setReplyingTo] = useState<CommentWithReplies | null>(null)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: 'gif' | 'sticker' | 'image' } | null>(null)

  const [showGifModal, setShowGifModal] = useState(false)
  const [gifSearch, setGifSearch] = useState('')
  const [gifTab, setGifTab] = useState<'gifs' | 'stickers'>('gifs')

  const isAuthor = article?.country_id === country?.id

  useEffect(() => {
    async function loadArticle() {
      if (!id) return
      const { data } = await supabase
        .from('articles')
        .select('*, countries(name, flag_emoji, users(flag_url))')
        .eq('id', id)
        .single()
      setArticle(data)
      setLoading(false)
    }
    loadArticle()
  }, [id])

  async function loadComments() {
    const flatComments = await fetchComments(id)
    
    const map = new Map<string, CommentWithReplies>()
    const roots: CommentWithReplies[] = []

    flatComments.forEach(c => {
      map.set(String(c.id), { ...c, replies: [] } as CommentWithReplies)
    })

    flatComments.forEach(c => {
      const node = map.get(String(c.id))!
      if (c.parent_id && map.has(String(c.parent_id))) {
        map.get(String(c.parent_id))!.replies.push(node)
      } else {
        roots.push(node)
      }
    })

    setComments(roots)
  }

  useEffect(() => {
    loadComments()
  }, [id])

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
    if (!reply.trim() && !selectedMedia) {
      setFeedback({ type: 'error', message: 'Escreva algo ou adicione uma mídia' })
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

    const parentId = replyingTo ? String(replyingTo.id) : undefined
    const result = await postComment(id, reply.trim(), parentId, mediaData)

    if (result.success) {
      setReply('')
      setSelectedMedia(null)
      setReplyingTo(null)
      await loadComments()
      setFeedback({ type: 'success', message: 'Comentário postado com sucesso! 🎉' })
    } else {
      setFeedback({ type: 'error', message: result.error || 'Erro ao postar comentário' })
    }

    setSending(false)
    setTimeout(() => setFeedback(null), 3000)
  }

  const selectGif = (url: string, type: 'gif' | 'sticker') => {
    setSelectedMedia({ url, type })
    setShowGifModal(false)
    setGifSearch('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  if (!article) return <div className="p-8 text-center text-white/40">Artigo não encontrado.</div>

  return (
    <div className="max-w-4xl mx-auto pb-24 px-2 sm:px-4 pt-4">
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/game/feed" className="text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors -ml-1">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight">Artigo</h1>
        </div>
        {isAuthor && (
          <div className="flex gap-2">
            <Link href={`/game/feed/editar/${id}`} className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <Pencil size={18} />
            </Link>
            <button onClick={handleDelete} disabled={deleting} className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-full transition-colors disabled:opacity-50">
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/[0.06] shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 shrink-0 flex items-center justify-center bg-black/50 shadow-sm">
            {getFlagUrl(article.countries) ? (
              <img src={getFlagUrl(article.countries)!} alt="Flag" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl leading-none">{article.countries?.flag_emoji ?? '🌐'}</span>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm">{article.countries?.name}</span>
            <span className="text-white/40 text-[11px]">{formatTime(article.created_at)}</span>
          </div>
          
          <span className="ml-auto text-xs bg-primary/20 text-primary-light font-semibold rounded-full px-3 py-1 shadow-sm">
            {article.category}
          </span>
        </div>
        
        <h2 className="text-white font-black text-2xl sm:text-3xl leading-snug mb-5">{article.title}</h2>
        
        {/* ✅ NOVO: RENDERIZAÇÃO COMPLETA DA MÍDIA (IMAGEM, VÍDEO, ÁUDIO, ARQUIVO) */}
        <div className="mb-6 flex flex-col gap-4">
          {article.image_url && (
            <img src={article.image_url} alt="Imagem do Artigo" className="w-full rounded-xl border border-white/10 shadow-lg object-cover max-h-[500px]" />
          )}
          {article.video_url && (
            <video src={article.video_url} controls className="w-full rounded-xl border border-white/10 shadow-lg max-h-[500px]" />
          )}
          {article.audio_url && (
            <div className="bg-surface-input border border-surface-border rounded-xl p-3 shadow-lg">
              <p className="text-[10px] text-white/50 uppercase font-mono tracking-widest mb-2 flex items-center gap-2">🎵 Áudio do Artigo</p>
              <audio src={article.audio_url} controls className="w-full" />
            </div>
          )}
          {article.file_url && (
            <a href={article.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold py-3 px-4 rounded-xl border border-primary/20 transition-colors w-fit">
              <FileText size={18} /> Baixar Arquivo Anexado
            </a>
          )}
        </div>

        <div className="text-slate-200 text-sm sm:text-base max-w-none prose prose-invert prose-p:leading-relaxed">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]} 
            rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
            components={{
              ul: ({node, ...props}) => <ul {...props} className="list-disc ml-5 my-2" />,
              ol: ({node, ...props}) => <ol {...props} className="list-decimal ml-5 my-2" />,
              li: ({node, ...props}) => <li {...props} className="mb-1" />,
              a: ({node, href, children, ...props}) => {
                if (!href) return <span {...props}>{children}</span>
                return <LinkPreview url={href}>{children}</LinkPreview>
              }
            }}
          >
            {article.content}
          </ReactMarkdown>
        </div>

        <div className="flex gap-4 mt-8 pt-4 border-t border-white/10">
          <button onClick={() => handleVote(1)} className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${article.user_vote === 1 ? 'text-green-400' : 'text-white/40 hover:text-green-400'}`}>
            👍 <span>{article.likes}</span>
          </button>
          <button onClick={() => handleVote(-1)} className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${article.user_vote === -1 ? 'text-red-400' : 'text-white/40 hover:text-red-400'}`}>
            👎 <span>{article.dislikes}</span>
          </button>
        </div>
      </div>

      {/* COMENTÁRIOS (MANTIDO) */}
      <div className="mt-6 bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/[0.06] shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold tracking-widest text-white/60 uppercase">Comentários ({comments.length})</h3>
          <button onClick={() => setShowGifModal(true)} className="text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            <Image size={14} /> GIF
          </button>
        </div>

        {comments.length === 0 && (
          <p className="text-white/30 text-sm text-center py-6 bg-black/20 rounded-xl border border-white/5">Sem comentários ainda. Seja o primeiro!</p>
        )}

        <div className="flex flex-col gap-5 mb-6">
          {comments.map((c) => (
            <CommentItem 
              key={c.id} 
              comment={c} 
              onReply={(targetComment) => setReplyingTo(targetComment)} 
            />
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {replyingTo && (
            <div className="flex items-center justify-between bg-primary/10 p-2.5 rounded-xl text-xs text-primary-light border border-primary/20">
              <span>Respondendo a <strong className="text-white">{replyingTo.countries?.name}</strong></span>
              <button onClick={() => setReplyingTo(null)} className="hover:text-white font-bold transition-colors">✕ Cancelar</button>
            </div>
          )}

          {feedback && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${feedback.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {feedback.type === 'success' ? <CheckCircle size={16} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
              <span>{feedback.message}</span>
            </div>
          )}

          {selectedMedia && (
            <div className="relative bg-black/40 rounded-xl overflow-hidden max-h-32 max-w-full border border-white/10">
              <img src={selectedMedia.url} alt="Mídia" className="w-full h-full object-contain max-h-32" />
              <button onClick={() => setSelectedMedia(null)} className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white rounded-full p-1 transition-colors"><X size={16} /></button>
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !sending && handleComment()}
              placeholder={replyingTo ? "Escreva sua resposta..." : "Adicione um comentário..."}
              disabled={sending}
              className="flex-1 bg-black/30 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleComment}
              disabled={sending || (!reply.trim() && !selectedMedia)}
              className="bg-primary hover:bg-primary-light text-white rounded-full w-10 h-10 flex items-center justify-center text-lg shadow-lg transition-colors disabled:opacity-30"
            >
              {sending ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE GIF (MANTIDO) */}
      {showGifModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">🎨 GIFs & Stickers</h3>
              <button onClick={() => setShowGifModal(false)} className="text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="flex gap-2 mb-4 bg-black/30 p-1 rounded-xl">
              <button onClick={() => setGifTab('gifs')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${gifTab === 'gifs' ? 'bg-primary text-white shadow-md' : 'text-white/50 hover:text-white'}`}>GIFs</button>
              <button onClick={() => setGifTab('stickers')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${gifTab === 'stickers' ? 'bg-primary text-white shadow-md' : 'text-white/50 hover:text-white'}`}>Stickers</button>
            </div>

            <div className="h-80 overflow-y-auto -mx-2 px-2 custom-scrollbar">
              <Grid
                key={gifTab + gifSearch}
                fetchGifs={(offset) => {
                  const searchTerm = gifSearch || 'funny'
                  if (gifTab === 'stickers') return gf.search(searchTerm, { offset, limit: 20, type: 'stickers' })
                  return gf.search(searchTerm, { offset, limit: 20 })
                }}
                columns={3} gutter={6} width={320}
                onGifClick={(gif: any, e: any) => {
                  e.preventDefault()
                  selectGif(gif.images.original.url, gifTab === 'stickers' ? 'sticker' : 'gif')
                }}
              />
            </div>

            <div className="flex gap-2 mt-4">
              <input
                type="text" value={gifSearch} onChange={(e) => setGifSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setGifTab(gifTab)}
                placeholder="Pesquisar..." className="flex-1 bg-black/40 border border-white/10 text-white px-4 py-2.5 rounded-xl focus:outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CommentItem({ comment, onReply, isReply = false }: { 
  comment: CommentWithReplies; 
  onReply: (c: CommentWithReplies) => void;
  isReply?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2 ${isReply ? 'ml-4 sm:ml-6 border-l-2 border-primary/20 pl-3 sm:pl-4' : ''}`}>
      <div className="flex gap-3">
        
        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0 flex items-center justify-center bg-black/50 mt-0.5 shadow-sm">
          {getFlagUrl(comment.countries) ? (
            <img src={getFlagUrl(comment.countries)!} alt="Flag" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg leading-none">{comment.countries?.flag_emoji ?? '🌐'}</span>
          )}
        </div>

        <div className="flex-1">
          <div className="bg-white/5 border border-white/[0.05] rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-white/80 text-xs font-bold">{comment.countries?.name}</p>
              <span className="text-white/30 text-[10px]">{formatTime(comment.created_at)}</span>
            </div>
            
            {comment.gif_url && <img src={comment.gif_url} alt="GIF" className="max-w-[200px] rounded-lg mt-2 border border-white/5" />}
            {comment.sticker_url && <img src={comment.sticker_url} alt="Sticker" className="max-w-[100px] rounded-lg mt-2" />}
            {comment.image_url && <img src={comment.image_url} alt="Imagem" className="max-w-[200px] rounded-lg mt-2 border border-white/5" />}
            
            <p className="text-white/90 text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
          </div>
          
          <div className="flex items-center gap-3 mt-1.5 ml-1">
            <button 
              onClick={() => onReply(comment)} 
              className="text-[11px] font-bold text-white/40 hover:text-white transition-colors"
            >
              Responder
            </button>
          </div>
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="flex flex-col gap-3 mt-2">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} onReply={onReply} isReply={true} />
          ))}
        </div>
      )}
    </div>
  )
}