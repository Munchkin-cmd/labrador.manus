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

import { GiphyFetch } from '@giphy/js-fetch-api'
import { Grid } from '@giphy/react-components'

const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY || '')

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span || []), 'className', 'style'],
    u: [], b: [], i: [],
    a: [...(defaultSchema.attributes?.a || []), 'target', 'rel', 'href'],
  },
  tagNames: [...(defaultSchema.tagNames || []), 'u', 'span', 'b', 'i'],
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

  // ... (Funções de comentário e voto mantidas) ...

  if (loading) return <div>Carregando...</div>
  if (!article) return <div>Artigo não encontrado.</div>

  // ✅ SEPARA AS URLS POR VÍRGULA PARA EXIBIR A GALERIA
  const imageUrls = article.image_url ? article.image_url.split(',') : []
  const videoUrls = article.video_url ? article.video_url.split(',') : []
  const audioUrls = article.audio_url ? article.audio_url.split(',') : []
  const fileUrls = article.file_url ? article.file_url.split(',') : []

  return (
    <div className="max-w-4xl mx-auto pb-24 px-2 sm:px-4 pt-4">
      {/* ... (Header e Autor mantidos) ... */}
      
      <h2 className="text-white font-black text-2xl sm:text-3xl leading-snug mb-5">{article.title}</h2>
      
      {/* ✅ GALERIA DE MÍDIA */}
      <div className="mb-6 space-y-4">
        {article.media_type === 'image' && imageUrls.length > 0 && (
          <div className={`grid gap-2 ${imageUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {imageUrls.map((url: string, idx: number) => (
              <img key={idx} src={url} alt={`Imagem ${idx}`} className="w-full rounded-xl border border-white/10 object-cover max-h-[400px]" />
            ))}
          </div>
        )}
        
        {article.media_type === 'video' && videoUrls.length > 0 && (
          <div className="grid gap-2 grid-cols-1">
            {videoUrls.map((url: string, idx: number) => (
              <video key={idx} src={url} controls className="w-full rounded-xl border border-white/10 max-h-[500px]" />
            ))}
          </div>
        )}
        
        {article.media_type === 'audio' && audioUrls.length > 0 && (
          <div className="space-y-2">
            {audioUrls.map((url: string, idx: number) => (
              <div key={idx} className="bg-surface-input border border-surface-border rounded-xl p-3">
                <audio src={url} controls className="w-full" />
              </div>
            ))}
          </div>
        )}
        
        {article.media_type === 'file' && fileUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {fileUrls.map((url: string, idx: number) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold py-3 px-4 rounded-xl border border-primary/20">
                <FileText size={18} /> Arquivo {idx + 1}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ✅ RENDERIZAÇÃO DO TEXTO COM QUEBRA DE LINHA GARANTIDA */}
      <div className="text-slate-200 text-sm sm:text-base max-w-none prose prose-invert prose-p:leading-relaxed whitespace-pre-wrap">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
          components={{
            p: ({node, ...props}) => <p {...props} className="mb-4" />, // Dá margem aos parágrafos
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
      
      {/* ... (Restante do código de votos, comentários e modal mantidos) ... */}
    </div>
  )
}