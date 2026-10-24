'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { CATEGORIES } from '@/hooks/useFeed'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import LinkPreview from '@/components/LinkPreview'
import {
  ArrowLeft, Eye, Send, Bold, Italic, Underline,
  List, ListOrdered, Link as LinkIcon,
  X, Loader2, Palette, Paperclip, Image, Video, Music, FileText
} from 'lucide-react'

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema?.attributes || {}),
    span: [...(defaultSchema?.attributes?.span || []), 'className', 'style'],
    u: [],
    b: [],
    i: [],
    a: [...(defaultSchema?.attributes?.a || []), 'target', 'rel', 'href'],
    img: [...(defaultSchema?.attributes?.img || []), 'src', 'alt', 'width', 'height'],
    video: [...(defaultSchema?.attributes?.video || []), 'src', 'controls', 'width', 'height'],
    audio: [...(defaultSchema?.attributes?.audio || []), 'src', 'controls'],
    source: [...(defaultSchema?.attributes?.source || []), 'src', 'type'],
  },
  tagNames: [...(defaultSchema?.tagNames || []), 'u', 'span', 'img', 'video', 'audio', 'source', 'b', 'i'],
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
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | 'file' | null>(null)
  const [showClipsMenu, setShowClipsMenu] = useState(false)
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
    setForm(prev => ({ ...prev, content: newText }))
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = cursorPos
      textarea.selectionEnd = cursorPos
    }, 10)
  }

  const insertBold = () => insertText('<b>', '</b>')
  const insertItalic = () => insertText('<i>', '</i>')
  const insertUnderline = () => insertText('<u>', '</u>')
  
  const insertQuote = () => insertText('> ', '')
  const insertLink = () => insertText('[Texto do link](', ')')
  const applyColor = (colorClass: string) => insertText(`<span class="${colorClass}">`, '</span>')

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

  function openFileSelector(accept: string, type: 'image' | 'video' | 'audio' | 'file') {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept
      fileInputRef.current.click()
    }
    setMediaType(type)
    setShowClipsMenu(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setMediaPreview(URL.createObjectURL(file))
    } else {
      setMediaPreview(null)
    }
  }

  function removeMedia() {
    setSelectedFile(null)
    setMediaPreview(null)
    setMediaType(null)
  }

  async function handlePublish() {
    if (!country?.id) return setError('Você precisa estar logado.')
    if (!form.title.trim()) return setError('Digite o título.')
    if (!form.content.trim()) return setError('Digite o conteúdo.')

    setLoading(true); setError(''); setSuccess('')
    
    try {
      // ✅ CORREÇÃO 1: Tipando as variáveis para aceitar string ou null
      let finalImageUrl: string | null = null
      let finalVideoUrl: string | null = null
      let finalAudioUrl: string | null = null
      let finalFileUrl: string | null = null

      if (selectedFile) {
        setUploadingMedia(true)
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `article_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `articles/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath)
        
        // ✅ CORREÇÃO 2: Era 'data.publicUrl', o correto é 'urlData.publicUrl'
        const publicUrl = urlData.publicUrl

        if (mediaType === 'image') finalImageUrl = publicUrl
        else if (mediaType === 'video') finalVideoUrl = publicUrl
        else if (mediaType === 'audio') finalAudioUrl = publicUrl
        else if (mediaType === 'file') finalFileUrl = publicUrl
        
        setUploadingMedia(false)
      }

      const { error: dbError } = await supabase.from('articles').insert({
        country_id: country.id,
        title: form.title,
        content: form.content,
        category: form.category,
        image_url: finalImageUrl,
        video_url: finalVideoUrl,
        audio_url: finalAudioUrl,
        file_url: finalFileUrl,
        media_type: mediaType as any, // ✅ CORREÇÃO 3: Força o tipo para o TypeScript parar de reclamar
        likes: 0, dislikes: 0,
      })
      
      if (dbError) throw dbError

      setSuccess('✅ Artigo publicado com sucesso!')
      setTimeout(() => router.push('/game/feed'), 2000)

    } catch (err: any) {
      setError(err.message || 'Erro ao publicar')
      setUploadingMedia(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 pt-4">
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
          
          <div className="flex flex-wrap gap-1 mb-2 bg-[#0a0a0a] border border-white/10 rounded-xl p-2 relative">
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
            
            <div className="relative">
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => setShowClipsMenu(!showClipsMenu)} className={`p-2 rounded-lg hover:bg-white/10 ${selectedFile ? 'text-primary bg-primary/10' : 'text-white/60 hover:text-white'}`} title="Anexar Mídia">
                <Paperclip size={18} />
              </button>

              {showClipsMenu && (
                <div className="absolute top-full left-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl p-1 shadow-2xl z-50 w-48">
                  <button onClick={() => openFileSelector('image/*', 'image')} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-mono text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors uppercase tracking-widest"><Image size={16} /> Imagem</button>
                  <button onClick={() => openFileSelector('video/*', 'video')} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-mono text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors uppercase tracking-widest"><Video size={16} /> Vídeo</button>
                  <button onClick={() => openFileSelector('audio/*', 'audio')} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-mono text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors uppercase tracking-widest"><Music size={16} /> Áudio</button>
                  <button onClick={() => openFileSelector('*/*', 'file')} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-mono text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors uppercase tracking-widest"><FileText size={16} /> Arquivo</button>
                </div>
              )}
            </div>

            <button onMouseDown={(e) => e.preventDefault()} onClick={insertLink} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white" title="Inserir link"><LinkIcon size={18} /></button>
          </div>

          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

          {selectedFile && (
            <div className="mb-3 relative bg-[#0a0a0a] border border-white/10 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-primary uppercase font-mono font-bold flex items-center gap-2">
                  {mediaType === 'image' ? <Image size={12}/> : mediaType === 'video' ? <Video size={12}/> : mediaType === 'audio' ? <Music size={12}/> : <FileText size={12}/>}
                  Arquivo Anexado
                </span>
                <button onClick={removeMedia} className="text-white/40 hover:text-red-400 bg-white/5 p-1 rounded-full transition-colors"><X size={14} /></button>
              </div>
              {mediaPreview && mediaType === 'image' && <img src={mediaPreview} className="max-h-40 rounded-lg object-contain" alt="Preview" />}
              {mediaPreview && mediaType === 'video' && <video src={mediaPreview} controls className="max-h-40 rounded-lg object-contain" />}
              {mediaType === 'audio' && <div className="text-white/60 text-sm font-mono truncate">{selectedFile.name}</div>}
              {mediaType === 'file' && <div className="text-white/60 text-sm font-mono truncate">{selectedFile.name}</div>}
            </div>
          )}

          <textarea 
            ref={textareaRef} 
            value={form.content} 
            onChange={(e) => setForm({ ...form, content: e.target.value })} 
            placeholder="Escreva aqui..." 
            className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-primary resize-y min-h-[300px] font-mono text-sm whitespace-pre-wrap" 
          />
        </div>

        {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</p>}
        {success && <p className="text-green-400 text-sm text-center bg-green-500/10 p-3 rounded-xl border border-green-500/20">{success}</p>}

        <div className="flex flex-wrap gap-3 pt-2">
          <button onClick={() => setPreview(!preview)} className="flex-1 min-w-[120px] bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"><Eye size={18} /> {preview ? 'Ocultar' : 'Prévia'}</button>
          <button onClick={handlePublish} disabled={loading} className="flex-1 min-w-[120px] bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {uploadingMedia ? <><Loader2 className="animate-spin" size={18}/> Enviando Mídia...</> : loading ? 'Publicando...' : <><Send size={18} /> Publicar</>}
          </button>
        </div>
      </div>

      {preview && (
        <div className="mt-8 bg-white/5 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white/60 mb-2">📄 Pré-visualização</h3>
          <div className="bg-black/30 rounded-lg p-4 max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-2">{form.title || 'Título'}</h2>
            
            {mediaPreview && mediaType === 'image' && <img src={mediaPreview} className="max-w-full rounded-lg my-4 border border-white/10" alt="Preview" />}
            {mediaPreview && mediaType === 'video' && <video src={mediaPreview} controls className="max-w-full rounded-lg my-4 border border-white/10" />}
            {mediaType === 'audio' && <div className="my-4 text-white/50 text-xs font-mono">Áudio anexado (O player aparecerá após publicar)</div>}

            <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkBreaks]}
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
    </div>
  )
}