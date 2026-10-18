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

// ✅ Permite que o rehype-sanitize aceite as tags de cor, sublinhado e links
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema?.attributes || {}),
    span: [...(defaultSchema?.attributes?.span || []), 'className', 'style'],
    u: [],
    a: [...(defaultSchema?.attributes?.a || []), 'target', 'rel', 'href'],
  },
  tagNames: [...(defaultSchema?.tagNames || []), 'u', 'span'],
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

  // ─── FUNÇÕES DO EDITOR ──────────────────────────────────
  function insertText(prefix: string = '', suffix: string = '') {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)
    let newText = ''
    let cursorPos = 0

    if (selected) {
      newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end)
      cursorPos = start + prefix.length + selected.length + suffix.length
    } else {
      newText = text.substring(0, start) + prefix + suffix + text.substring(end)
      cursorPos = start + prefix.length
    }

    setForm({ ...form, content: newText })

    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = cursorPos
      textarea.selectionEnd = cursorPos
    }, 10)
  }

  function insertBold() { insertText('**', '**') }
  function insertItalic() { insertText('*', '*') }
  function insertUnderline() { insertText('<u>', '</u>') }

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
    setForm({ ...form, content: newText })
    setTimeout(() => { textarea.focus(); textarea.selectionStart = textarea.selectionEnd = lineStart + newLine.length }, 10)
  }

  function insertQuote() { insertText('> ', '') }

  function insertList() {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const text = textarea.value
    let lineStart = text.lastIndexOf('\n', start - 1) + 1
    const currentLine = text.substring(lineStart, start)
    const newLine = currentLine.trim().startsWith('- ') ? currentLine : `- ${currentLine}`
    const newText = text.substring(0, lineStart) + '\n' + newLine + text.substring(start)
    setForm({ ...form, content: newText })
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
    setForm({ ...form, content: newText })
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

      setForm({
        ...form,
        [columnName]: publicUrl,
        media_type: mediaType as 'image' | 'video' | 'audio' | 'file',
      })
      setMediaModal(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload')
    } finally {
      setUploadingMedia(false)
    }
  }

  function insertMediaDirectly(url: string, type: 'image' | 'video' | 'audio' | 'file') {
    const columnName = type === 'image' ? 'image_url' : type === 'video' ? 'video_url' : type === 'audio' ? 'audio_url' : 'file_url'
    setForm({ ...form, [columnName]: url, media_type: type })
  }

  // ─── MODAL DE MÍDIA ────────────────────────────────────
  function MediaModal({ type, onClose }: { type: 'image' | 'video' | 'audio' | 'file'; onClose: () => void }) {
    const [url, setUrl] = useState('')
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-surface-card border border-surface-border rounded-xl p-6 max-w-md w-full shadow-2xl relative">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-bold text-sm font-mono uppercase tracking-widest flex items-center gap-2">
              <Image size={16} className="text-primary" /> Inserir Mídia
            </h3>
            <button onClick={onClose} className="text-white/40 hover:text-white bg-white/5 p-1.5 rounded-md transition-colors"><X size={18} /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-white/50 text-[10px] font-bold font-mono uppercase tracking-widest block mb-1.5">URL da Mídia</label>
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Cole o link aqui..." className="input-field bg-surface-input text-sm" />
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-border"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="px-2 bg-surface-card text-white/40 font-mono uppercase tracking-widest">ou faça upload</span>
              </div>
            </div>

            <div>
              <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], type) }} disabled={uploadingMedia} className="w-full text-white text-xs file:bg-surface-input file:border file:border-surface-border file:text-white file:font-mono file:text-[10px] file:uppercase file:tracking-wider file:px-3 file:py-2 file:rounded-md file:mr-3 cursor-pointer" />
            </div>

            {uploadingMedia && <div className="flex items-center gap-2 text-primary text-xs font-mono"><Loader2 className="animate-spin" size={14} /> Enviando arquivo...</div>}
            
            <button onClick={() => { if (url.trim()) { insertMediaDirectly(url, type); onClose() } }} disabled={!url.trim() || uploadingMedia} className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold font-mono uppercase tracking-widest text-xs py-3 rounded-lg transition-colors shadow-lg shadow-primary/20">
              Inserir Link
            </button>
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
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-24">
      {mediaModal === 'image' && <MediaModal type="image" onClose={() => setMediaModal(null)} />}
      {mediaModal === 'video' && <MediaModal type="video" onClose={() => setMediaModal(null)} />}
      {mediaModal === 'audio' && <MediaModal type="audio" onClose={() => setMediaModal(null)} />}
      {mediaModal === 'file' && <MediaModal type="file" onClose={() => setMediaModal(null)} />}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/game/feed" className="text-white/60 hover:text-white transition-colors p-1.5 bg-surface-input border border-surface-border rounded-md">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-2 pl-1">
          <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          <h1 className="text-xs font-bold font-mono tracking-widest text-white uppercase">Novo Artigo</h1>
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-lg p-5 sm:p-6 shadow-lg flex flex-col gap-5">
        
        {/* Categoria */}
        <div>
          <label className="text-white/50 text-[10px] font-bold font-mono uppercase tracking-widest block mb-1.5">Categoria</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field bg-surface-input text-sm cursor-pointer">
            {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        
        {/* Título */}
        <div>
          <label className="text-white/50 text-[10px] font-bold font-mono uppercase tracking-widest block mb-1.5">Título</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Digite o título do artigo" className="input-field bg-surface-input text-sm" />
        </div>

        {/* Cores */}
        <div>
          <label className="text-white/50 text-[10px] font-bold font-mono uppercase tracking-widest block mb-1.5 flex items-center gap-2">
            <Palette size={14} /> Cor do Texto (Selecione o texto antes)
          </label>
          <div className="flex flex-wrap gap-2">
            {textColorOptions.map((opt) => (
              <button key={opt.class} onClick={() => applyColor(opt.class)} className="px-3 py-1.5 rounded-md bg-surface-input border border-surface-border hover:bg-white/5 transition-colors">
                <span className={`text-[10px] font-bold font-mono uppercase tracking-wider ${opt.class}`}>{opt.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor de Conteúdo */}
        <div>
          <label className="text-white/50 text-[10px] font-bold font-mono uppercase tracking-widest block mb-1.5">Conteúdo</label>
          
          {/* Toolbar */}
          <div className="flex flex-wrap gap-1 mb-2 bg-surface-input border border-surface-border rounded-lg p-1.5">
            <button onClick={insertBold} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Negrito"><Bold size={16} /></button>
            <button onClick={insertItalic} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Itálico"><Italic size={16} /></button>
            <button onClick={insertUnderline} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Sublinhado"><Underline size={16} /></button>
            <div className="w-px bg-surface-border mx-1" />
            <button onClick={insertHeading} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-colors" title="Título">H</button>
            <button onClick={insertQuote} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Citação"><FileText size={16} /></button>
            <div className="w-px bg-surface-border mx-1" />
            <button onClick={insertList} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Lista"><List size={16} /></button>
            <button onClick={insertNumberedList} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Lista Numerada"><ListOrdered size={16} /></button>
            <div className="w-px bg-surface-border mx-1" />
            <button onClick={() => setMediaModal('image')} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"><Image size={16} /></button>
            <button onClick={insertLink} className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Inserir link"><LinkIcon size={16} /></button>
          </div>

          <textarea 
            ref={textareaRef} 
            value={form.content} 
            onChange={(e) => setForm({ ...form, content: e.target.value })} 
            placeholder="Escreva o conteúdo do artigo aqui..." 
            className="input-field bg-surface-input text-sm font-mono leading-relaxed resize-y min-h-[300px]" 
          />
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-surface-input border border-surface-border rounded-lg p-4 mt-2">
            <h3 className="text-[10px] font-bold font-mono uppercase tracking-widest text-white/50 mb-3 flex items-center gap-2">
              <Eye size={14} /> Pré-visualização
            </h3>
            <div className="bg-surface-card border border-surface-border rounded-lg p-4 max-h-96 overflow-y-auto custom-scrollbar">
              <h2 className="text-xl font-bold text-white mb-2">{form.title || 'Título do Artigo'}</h2>
              
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                components={{
                  ul: ({node, ...props}) => <ul {...props} className="list-disc ml-5 my-2 text-white/80" />,
                  ol: ({node, ...props}) => <ol {...props} className="list-decimal ml-5 my-2 text-white/80" />,
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

        {error && <p className="text-xs font-mono text-center text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{error}</p>}
        {success && <p className="text-xs font-mono text-center text-green-400 bg-green-500/10 border border-green-500/20 p-3 rounded-lg">{success}</p>}

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button 
            onClick={() => setPreview(!preview)} 
            className="flex-1 bg-surface-input border border-surface-border hover:bg-white/5 text-white font-bold font-mono uppercase tracking-widest py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs"
          >
            <Eye size={16} /> {preview ? 'Ocultar Prévia' : 'Pré-visualizar'}
          </button>
          
          <button 
            onClick={handlePublish} 
            disabled={loading} 
            className="flex-1 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold font-mono uppercase tracking-widest py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs shadow-lg shadow-primary/20"
          >
            <Send size={16} /> {loading ? 'Publicando...' : 'Publicar Artigo'}
          </button>
        </div>
        
      </div>
    </div>
  )
}