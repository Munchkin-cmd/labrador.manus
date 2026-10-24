'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { CATEGORIES } from '@/hooks/useFeed'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import LinkPreview from '@/components/LinkPreview'
import {
  ArrowLeft, Eye, Send, Bold, Italic, Underline,
  List, ListOrdered, Link as LinkIcon,
  Image, Video, Music, FileText, X, Loader2, Palette
} from 'lucide-react'

// ✅ PERMITE TAGS DE MÍDIA E CORES NO SANITIZE
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema?.attributes || {}),
    span: [...(defaultSchema?.attributes?.span || []), 'className', 'style'],
    u: [],
    a: [...(defaultSchema?.attributes?.a || []), 'target', 'rel', 'href'],
    img: [...(defaultSchema?.attributes?.img || []), 'src', 'alt', 'width', 'height'],
    video: [...(defaultSchema?.attributes?.video || []), 'src', 'controls', 'width', 'height'],
    audio: [...(defaultSchema?.attributes?.audio || []), 'src', 'controls'],
    source: [...(defaultSchema?.attributes?.source || []), 'src', 'type'],
  },
  tagNames: [...(defaultSchema?.tagNames || []), 'u', 'span', 'img', 'video', 'audio', 'source'],
}

export default function NovoArtigoPage() {
  const router = useRouter()
  const { country } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    category: CATEGORIES[0] || 'Geral',
    title: '',
    content: '',
    image_url: '',
    video_url: '',
    audio_url: '',
    file_url: '',
    media_type: null as 'image' | 'video' | 'audio' | 'file' | null,
  })

  const [mediaModal, setMediaModal] = useState<'image' | 'video' | 'audio' | 'file' | null>(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)

  const textColorOptions = [
    { name: 'Branco', class: 'text-white' },
    { name: 'Cinza', class: 'text-gray-300' },
    { name: 'Vermelho', class: 'text-red-400' },
    { name: 'Verde', class: 'text-green-400' },
    { name: 'Azul', class: 'text-blue-400' },
    { name: 'Amarelo', class: 'text-yellow-400' },
    { name: 'Roxo', class: 'text-purple-400' },
    { name: 'Rosa', class: 'text-pink-400' },
  ]

  // ─── FUNÇÕES DO EDITOR (CORRIGIDAS) ──────────────────────────────────
  function insertText(prefix: string = '', suffix: string = '') {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)
    
    // Calcula o novo texto com base na seleção
    let newText = ''
    let cursorPos = 0

    if (selected) {
      newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end)
      cursorPos = start + prefix.length + selected.length + suffix.length
    } else {
      newText = text.substring(0, start) + prefix + suffix + text.substring(end)
      cursorPos = start + prefix.length
    }

    // ✅ CORREÇÃO: Usa prev para não perder o estado e atualiza o valor
    setForm(prev => ({ ...prev, content: newText }))

    // Devolve o foco e a posição do cursor
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = cursorPos
      textarea.selectionEnd = cursorPos
    }, 10)
  }

  function insertBold() { insertText('**', '**') }
  function insertItalic() { insertText('*', '*') }
  function insertUnderline() { insertText('<u>', '</u>') }
  function insertQuote() { insertText('> ', '') }

  function insertHeading() {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const text = textarea.value
    let lineStart = text.lastIndexOf('\n', start - 1) + 1
    const lineEnd = text.indexOf('\n', start) === -1 ? text.length : text.indexOf('\n', start)
    const currentLine = text.substring(lineStart, lineEnd)
    const newLine = currentLine.startsWith('## ') ? currentLine.substring(3) : '## ' + currentLine
    const newText = text.substring(0, lineStart) + newLine + text.substring(lineEnd)
    
    setForm(prev => ({ ...prev, content: newText }))
    setTimeout(() => { textarea.focus(); textarea.selectionStart = textarea.selectionEnd = lineStart + newLine.length }, 10)
  }

  function insertList() {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const text = textarea.value
    let lineStart = text.lastIndexOf('\n', start - 1) + 1
    const currentLine = text.substring(lineStart, start)
    const newLine = currentLine.trim().startsWith('- ') ? currentLine : `- ${currentLine}`
    const newText = text.substring(0, lineStart) + '\n' + newLine + text.substring(start)
    
    setForm(prev => ({ ...prev, content: newText }))
    setTimeout(() => { textarea.focus(); }, 10)
  }

  function insertNumberedList() {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const text = textarea.value
    let lineStart = text.lastIndexOf('\n', start - 1) + 1
    const currentLine = text.substring(lineStart, start)
    const newLine = currentLine.trim().match(/^\d+\. /) ? currentLine : `1. ${currentLine}`
    const newText = text.substring(0, lineStart) + '\n' + newLine + text.substring(start)
    
    setForm(prev => ({ ...prev, content: newText }))
    setTimeout(() => { textarea.focus(); }, 10)
  }

  function insertLink() { insertText('[Texto do link](', ')') }
  function applyColor(colorClass: string) { insertText(`<span class="${colorClass}">`, '</span>') }

  // ─── FUNÇÕES DE MÍDIA ──────────────────────────────────
  async function handleFileUpload(file: File, type: 'image' | 'video' | 'audio' | 'file') {
    if (!file) return
    setUploadingMedia(true)
    try {
      let mediaType: string; let columnName: string
      if (type === 'image' && file.type.startsWith('image/')) { mediaType = 'image'; columnName = 'image_url' }
      else if (type === 'video' && file.type.startsWith('video/')) { mediaType = 'video'; columnName = 'video_url' }
      else if (type === 'audio' && file.type.startsWith('audio/')) { mediaType = 'audio'; columnName = 'audio_url' }
      else { mediaType = 'file'; columnName = 'file_url' }

      const fileExt = file.name.split('.').pop()
      const fileName = `article_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `articles/${fileName}`

      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath)
      const publicUrl = urlData.publicUrl

      setForm(prev => ({
        ...prev,
        [columnName]: publicUrl,
        media_type: mediaType as 'image' | 'video' | 'audio' | 'file',
      }))
      setMediaModal(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload')
    } finally {
      setUploadingMedia(false)
    }
  }

  function insertMediaDirectly(url: string, type: 'image' | 'video' | 'audio' | 'file') {
    const columnName = type === 'image' ? 'image_url' : type === 'video' ? 'video_url' : type === 'audio' ? 'audio_url' : 'file_url'
    setForm(prev => ({ ...prev, [columnName]: url, media_type: type }))
  }

  // ─── MODAL DE MÍDIA ────────────────────────────────────
  function MediaModal({ type, onClose }: { type: 'image' | 'video' | 'audio' | 'file'; onClose: () => void }) {
    const [url, setUrl] = useState('')
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold">Inserir Mídia</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white/70"><X size={20} /></button>
          </div>
          <div className="space-y-3">
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Cole a URL..." className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-primary transition-colors" />
            <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], type) }} disabled={uploadingMedia} className="w-full text-white text-sm" />
            {uploadingMedia && <div className="flex items-center gap-2 text-primary-light text-sm"><Loader2 className="animate-spin" size={16} /> Enviando...</div>}
            <button onClick={() => { if (url.trim()) { insertMediaDirectly(url, type); onClose() } }} disabled={!url.trim() || uploadingMedia} className="w-full bg-primary text-white font-semibold py-2 rounded-xl">Inserir</button>
          </div>
        </div>
      </div>
    )
  }

  async function handlePublish() {
    if (!country?.id) return setError('Você precisa estar logado.')
    if (!form.title.trim()) return setError('Digite o título.')
    if (!form.content.trim()) return setError('Digite o conteúdo.')

    setLoading(true); setError(''); setSuccess('')
    try {
      const { error } = await supabase.from('articles').insert({
        country_id: country.id,
        title: form.title,
        content: form.content,
        category: form.category,
        image_url: form.image_url || null,
        video_url: form.video_url || null,
        file_url: form.file_url || null,
        // Se a tabela tiver audio_url, adicione aqui. Se não tiver, precisará criar.
        media_type: form.media_type,
        likes: 0, dislikes: 0,
      })
      if (error) throw error
      setSuccess('✅ Artigo publicado com sucesso!')
      setTimeout(() => router.push('/game/feed'), 2000)
    } catch (err: any) {
      setError(err.message || 'Erro ao publicar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 pt-4">
      {mediaModal === 'image' && <MediaModal type="image" onClose={() => setMediaModal(null)} />}
      {mediaModal === 'video' && <MediaModal type="video" onClose={() => setMediaModal(null)} />}
      {mediaModal === 'audio' && <MediaModal type="audio" onClose={() => setMediaModal(null)} />}
      {mediaModal === 'file' && <MediaModal type="file" onClose={() => setMediaModal(null)} />}

      <div className="flex items-center gap-4 mb-6">
        <Link href="/game/feed" className="text-white/50 hover:text-white transition-colors p-2 -ml-2"><ArrowLeft size={24} /></Link>
        <h1 className="text-2xl font-bold text-white">Novo Artigo</h1>
      </div>

      <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 space-y-4">
        <div>
          <label className="text-white/60 text-sm font-semibold block mb-1.5">Categoria</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-primary">
            {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="text-white/60 text-sm font-semibold block mb-1.5">Título</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título" className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-primary" />
        </div>

        <div>
          <label className="text-white/60 text-sm font-semibold block mb-1.5 flex items-center gap-2"><Palette size={16} /> Cor do Texto (Selecione o texto antes)</label>
          <div className="flex flex-wrap gap-2">
            {textColorOptions.map((opt) => (
              <button key={opt.class} onClick={() => applyColor(opt.class)} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 transition-colors">
                <span className={opt.class}>{opt.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-white/60 text-sm font-semibold block mb-1.5">Conteúdo</label>
          <div className="flex flex-wrap gap-1 mb-2 bg-[#0a0a0a] border border-white/10 rounded-xl p-2">
            {/* ✅ CORREÇÃO: onMouseDown previne a perda de foco do textarea */}
            <button onMouseDown={(e) => e.preventDefault()} onClick={insertBold} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" title="Negrito"><Bold size={18} /></button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={insertItalic} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" title="Itálico"><Italic size={18} /></button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={insertUnderline} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" title="Sublinhado"><Underline size={18} /></button>
            <div className="w-px bg-white/10 mx-1" />
            <button onMouseDown={(e) => e.preventDefault()} onClick={insertHeading} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold" title="Título">H</button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={insertQuote} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" title="Citação"><FileText size={18} /></button>
            <div className="w-px bg-white/10 mx-1" />
            <button onMouseDown={(e) => e.preventDefault()} onClick={insertList} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" title="Lista"><List size={18} /></button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={insertNumberedList} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" title="Lista Numerada"><ListOrdered size={18} /></button>
            <div className="w-px bg-white/10 mx-1" />
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => setMediaModal('image')} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" title="Inserir Imagem"><Image size={18} /></button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => setMediaModal('audio')} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" title="Inserir Áudio"><Music size={18} /></button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={insertLink} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" title="Inserir link"><LinkIcon size={18} /></button>
          </div>

          <textarea ref={textareaRef} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Escreva aqui..." className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-primary resize-y min-h-[300px] font-mono text-sm" />
        </div>

        {preview && (
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-sm font-semibold text-white/60 mb-2">📄 Pré-visualização</h3>
            <div className="bg-black/30 rounded-lg p-4 max-h-96 overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-2">{form.title || 'Título'}</h2>
              
              {/* ✅ NOVO: Exibe a mídia anexada antes do texto */}
              {form.image_url && <img src={form.image_url} className="max-w-full rounded-lg my-4 border border-white/10" alt="Preview" />}
              {form.video_url && <video src={form.video_url} controls className="max-w-full rounded-lg my-4 border border-white/10" />}
              {form.audio_url && <audio src={form.audio_url} controls className="max-w-full rounded-lg my-4 border border-white/10" />}

              {/* ✅ PREVIEW COM CORES, LISTAS E CARTÃO DE LINK */}
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
                {form.content || 'O conteúdo do artigo aparecerá aqui...'}
              </ReactMarkdown>

            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-xl">{error}</p>}
        {success && <p className="text-green-400 text-sm text-center bg-green-500/10 p-3 rounded-xl">{success}</p>}

        <div className="flex flex-wrap gap-3 pt-2">
          <button onClick={() => setPreview(!preview)} className="flex-1 min-w-[120px] bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"><Eye size={18} /> {preview ? 'Ocultar' : 'Prévia'}</button>
          <button onClick={handlePublish} disabled={loading} className="flex-1 min-w-[120px] bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"><Send size={18} /> {loading ? 'Publicando...' : 'Publicar'}</button>
        </div>
      </div>
    </div>
  )
}