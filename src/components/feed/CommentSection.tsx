'use client'

import { useState, useEffect } from 'react'
import { useFeed, Comment } from '@/hooks/useFeed'
import { formatTime } from '@/utils/format'

interface CommentWithReplies extends Comment {
  replies: CommentWithReplies[]
}

export default function CommentSection({ articleId }: { articleId: string }) {
  const { fetchComments, postComment } = useFeed()
  const [comments, setComments] = useState<CommentWithReplies[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null)
  const [sending, setSending] = useState(false)

  // Buscar e organizar em árvore
  const loadComments = async () => {
    setLoading(true)
    const flatComments = await fetchComments(articleId)
    
    // Algoritmo para transformar lista plana em árvore de respostas
    const map = new Map<string, CommentWithReplies>()
    const roots: CommentWithReplies[] = []

    flatComments.forEach(c => {
      map.set(c.id, { ...c, replies: [] })
    })

    flatComments.forEach(c => {
      const node = map.get(c.id)!
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id)!.replies.push(node)
      } else {
        roots.push(node)
      }
    })

    setComments(roots)
    setLoading(false)
  }

  useEffect(() => {
    loadComments()
  }, [articleId])

  const handlePost = async () => {
    if (!newComment.trim() && !replyingTo) return
    setSending(true)

    // Se estiver respondendo, envia o parentId. Se não, envia undefined (comentário raiz)
    const res = await postComment(articleId, newComment, replyingTo?.id)
    
    if (res.success) {
      setNewComment('')
      setReplyingTo(null)
      await loadComments() // Recarrega a lista
    } else {
      alert(res.error)
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col gap-4 mt-6">
      {/* Lista de Comentários */}
      {loading ? (
        <p className="text-white/40 text-sm">Carregando comentários...</p>
      ) : comments.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-4">Nenhum comentário ainda. Seja o primeiro!</p>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map(comment => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              onReply={(c) => setReplyingTo(c)} 
            />
          ))}
        </div>
      )}

      {/* Caixa de Digitar */}
      <div className="bg-surface-card p-3 rounded-xl border border-white/10 flex flex-col gap-2">
        {replyingTo && (
          <div className="flex items-center justify-between bg-white/5 p-2 rounded text-xs text-white/60">
            <span>Respondendo a <strong>{replyingTo.countries?.name}</strong></span>
            <button onClick={() => setReplyingTo(null)} className="text-red-400 hover:text-red-300">✕ Cancelar</button>
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder={replyingTo ? "Escreva sua resposta..." : "Escreva um comentário..."}
            className="input-field flex-1 text-sm py-2"
            onKeyDown={(e) => e.key === 'Enter' && handlePost()}
          />
          <button 
            onClick={handlePost}
            disabled={sending}
            className="bg-primary hover:bg-primary-light px-4 rounded-lg text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            {sending ? '...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente Recursivo para renderizar o comentário e suas respostas
function CommentItem({ comment, onReply, isReply = false }: { 
  comment: CommentWithReplies, 
  onReply: (c: Comment) => void,
  isReply?: boolean 
}) {
  return (
    <div className={`flex flex-col gap-2 ${isReply ? 'ml-6 border-l-2 border-white/10 pl-3' : ''}`}>
      <div className="bg-surface-card p-3 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{comment.countries?.flag_emoji ?? '🌐'}</span>
          <p className="text-white/70 text-xs font-semibold">{comment.countries?.name}</p>
          <p className="text-white/30 text-[10px]">{formatTime(comment.created_at)}</p>
        </div>
        <p className="text-white/90 text-sm whitespace-pre-wrap">{comment.content}</p>
        
        <button 
          onClick={() => onReply(comment)}
          className="text-white/40 text-xs font-semibold mt-2 hover:text-white transition-colors"
        >
          Responder
        </button>
      </div>

      {/* Renderiza as respostas recursivamente */}
      {comment.replies.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} onReply={onReply} isReply={true} />
          ))}
        </div>
      )}
    </div>
  )
}