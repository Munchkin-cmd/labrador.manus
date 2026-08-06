'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { CATEGORIES } from '@/hooks/useFeed'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft, Eye, Send, Bold, Italic, Underline,
  List, ListOrdered, Link as LinkIcon,
  Image, Video, Music, FileText, X, Loader2, Palette
} from 'lucide-react'

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
    audio_url: '', // ← Adicionar suporte para áudio
    file_url: '',
    media_type: null as 'image' | 'video' | 'audio' | 'file' | null,
  })

  const [mediaModal, setMediaModal] = useState<'image' | 'video' | 'audio' | 'file' | null>(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)

  // ─── CORES PARA TEMAS ──────────────────────────────────
  const [contentColor, setContentColor] = useState('text-white')
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
  function insertUnderline() { insertText('__', '__') }

  function insertHeading() {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value

    let lineStart = text.lastIndexOf('\n', start - 1) + 1
    const lineEnd = text.indexOf('\n', start) === -1 ? text.length : text.indexOf('\n', start)
    const currentLine = text.substring(lineStart, lineEnd)

    const newLine = currentLine.startsWith('# ')
      ? currentLine.substring(2)
      : '# ' + currentLine

    const newText = text.substring(0, lineStart) + newLine + text.substring(lineEnd)
    setForm({ ...form, content: newText })

    setTimeout(() => {
      textarea.focus()
      const newCursor = lineStart + newLine.length
      textarea.selectionStart = newCursor
      textarea.selectionEnd = newCursor
    }, 10)
  }

  function insertQuote() {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)

    if (!selected) {
      insertText('> ', '')
      return
    }

    const lines = selected.split('\n')
    const quotedLines = lines.map(line => `> ${line}`).join('\n')
    const newText = text.substring(0, start) + quotedLines + text.substring(end)

    const cursorPos = start + quotedLines.length
    setForm({ ...form, content: newText })

    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = cursorPos
      textarea.selectionEnd = cursorPos
    }, 10)
  }

  function insertList() {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value

    if (start !== end) {
      const selected = text.substring(start, end)
      const lines = selected.split('\n')
      const newLines = lines.map(line => line.trim().startsWith('- ') ? line : `- ${line}`)
      const newText = text.substring(0, start) + newLines.join('\n') + text.substring(end)
      setForm({ ...form, content: newText })
      return
    }

    let lineStart = text.lastIndexOf('\n', start - 1) + 1
    const lineEnd = text.indexOf('\n', start) === -1 ? text.length : text.indexOf('\n', start)
    const currentLine = text.substring(lineStart, lineEnd)
    const newLine = currentLine.trim().startsWith('- ') ? currentLine : `- ${currentLine}`
    const newText = text.substring(0, lineStart) + newLine + text.substring(lineEnd)
    setForm({ ...form, content: newText })
  }

  function insertNumberedList() {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value

    if (start !== end) {
      const selected = text.substring(start, end)
      const lines = selected.split('\n')
      let counter = 1
      const newLines = lines.map(line => {
        if (line.trim().match(/^\d+\. /)) return line
        return `${counter++}. ${line}`
      })
      const newText = text.substring(0, start) + newLines.join('\n') + text.substring(end)
      setForm({ ...form, content: newText })
      return
    }

    let lineStart = text.lastIndexOf('\n', start - 1) + 1
    const lineEnd = text.indexOf('\n', start) === -1 ? text.length : text.indexOf('\n', start)
    const currentLine = text.substring(lineStart, lineEnd)
    const newLine = currentLine.trim().match(/^\d+\. /) ? currentLine : `1. ${currentLine}`
    const newText = text.substring(0, lineStart) + newLine + text.substring(lineEnd)
    setForm({ ...form, content: newText })
  }

  function insertLink() { insertText('[Texto do link](', ')') }

  // ─── FUNÇÕES DE MÍDIA ──────────────────────────────────
  async function handleFileUpload(file: File, type: 'image' | 'video' | 'audio' | 'file') {
    console.log('📤 [NovoArtigo] handleFileUpload:', { fileName: file.name, type })
    
    if (!file) return

    setUploadingMedia(true)

    try {
      let mediaType: string
      let columnName: string

      if (type === 'image' && file.type.startsWith('image/')) {
        mediaType = 'image'
        columnName = 'image_url'
      } else if (type === 'video' && file.type.startsWith('video/')) {
        mediaType = 'video'
        columnName = 'video_url'
      } else if (type === 'audio' && file.type.startsWith('audio/')) {
        mediaType = 'audio'
        columnName = 'audio_url'
      } else {
        mediaType = 'file'
        columnName = 'file_url'
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `article_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `articles/${fileName}`

      console.log('📁 [NovoArtigo] Enviando arquivo:', { filePath, mediaType })

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        console.error('❌ [NovoArtigo] Erro no upload:', uploadError)
        throw uploadError
      }

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl

      console.log('✅ [NovoArtigo] Arquivo enviado:', { publicUrl, mediaType })

      // ✅ ATUALIZA O FORM CORRETAMENTE
      setForm({
        ...form,
        image_url: columnName === 'image_url' ? publicUrl : form.image_url,
        video_url: columnName === 'video_url' ? publicUrl : form.video_url,
        audio_url: columnName === 'audio_url' ? publicUrl : form.audio_url,
        file_url: columnName === 'file_url' ? publicUrl : form.file_url,
        media_type: mediaType as 'image' | 'video' | 'audio' | 'file',
      })

      setMediaModal(null)
    } catch (err) {
      console.error('❌ [NovoArtigo] Erro no upload:', err)
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload')
    } finally {
      setUploadingMedia(false)
    }
  }

  function insertMediaDirectly(url: string, type: 'image' | 'video' | 'audio' | 'file') {
    console.log('🎬 [NovoArtigo] insertMediaDirectly:', { url, type })
    
    setForm({
      ...form,
      image_url: type === 'image' ? url : form.image_url,
      video_url: type === 'video' ? url : form.video_url,
      audio_url: type === 'audio' ? url : form.audio_url,
      file_url: type === 'file' ? url : form.file_url,
      media_type: type,
    })
  }

  // ─── MODAL DE MÍDIA ────────────────────────────────────
  function MediaModal({ type, onClose }: { type: 'image' | 'video' | 'audio' | 'file'; onClose: () => void }) {
    const [url, setUrl] = useState('')

    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold">
              {type === 'image' ? '📷 Inserir Imagem' : 
               type === 'video' ? '🎥 Inserir Vídeo' : 
               type === 'audio' ? '🎵 Inserir Áudio' : '📄 Inserir Arquivo'}
            </h3>
            <button onClick={onClose} className="text-white/40 hover:text-white/70">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-white/60 text-sm block mb-1.5">URL ou Upload</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={`Cole a URL do ${type}...`}
                className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex gap-2 text-white/40 text-sm">
              <span className="flex-1 border-t border-white/5" />
              <span>ou</span>
              <span className="flex-1 border-t border-white/5" />
            </div>

            <div>
              <label className="text-white/60 text-sm block mb-1.5">Upload de arquivo</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileUpload(e.target.files[0], type)
                  }
                }}
                accept={
                  type === 'image' ? 'image/*' :
                  type === 'video' ? 'video/*' :
                  type === 'audio' ? 'audio/*' : '*'
                }
                disabled={uploadingMedia}
                className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-primary transition-colors file:bg-primary file:border-0 file:text-white file:px-4 file:py-2 file:rounded-lg file:cursor-pointer disabled:opacity-50"
              />
              {uploadingMedia && (
                <div className="flex items-center gap-2 mt-2 text-primary-light text-sm">
                  <Loader2 className="animate-spin" size={16} />
                  Enviando arquivo...
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (url.trim()) {
                  insertMediaDirectly(url, type)
                  onClose()
                }
              }}
              disabled={!url.trim() || uploadingMedia}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Inserir {type === 'image' ? 'Imagem' : type === 'video' ? 'Vídeo' : type === 'audio' ? 'Áudio' : 'Arquivo'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  async function handlePublish() {
    console.log('📝 [NovoArtigo] handlePublish:', { title: form.title, media_type: form.media_type })
    
    if (!country?.id) {
      setError('Você precisa estar logado para publicar um artigo.')
      return
    }

    if (!form.category) {
      setError('Selecione uma categoria')
      return
    }

    if (!form.title.trim()) {
      setError('Digite o título do artigo')
      return
    }

    if (!form.content.trim()) {
      setError('Digite o conteúdo do artigo')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('💾 [NovoArtigo] Salvando artigo no banco...')
      
      const { error } = await supabase
        .from('articles')
        .insert({
          country_id: country.id,
          title: form.title,
          content: form.content,
          category: form.category,
          image_url: form.image_url || null,
          video_url: form.video_url || null,
          file_url: form.file_url || null,
          media_type: form.media_type,
          likes: 0,
          dislikes: 0,
        })

      if (error) {
        console.error('❌ [NovoArtigo] Erro ao publicar:', error)
        throw error
      }

      console.log('✅ [NovoArtigo] Artigo publicado com sucesso!')
      setSuccess('✅ Artigo publicado com sucesso!')

      setForm({
        category: CATEGORIES[0] || 'Geral',
        title: '',
        content: '',
        image_url: '',
        video_url: '',
        audio_url: '',
        file_url: '',
        media_type: null,
      })

      setTimeout(() => {
        router.push('/game/feed')
      }, 2000)
    } catch (err: any) {
      console.error('❌ [NovoArtigo] Erro crítico:', err)
      setError(err.message || 'Erro ao publicar artigo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      {/* Modais de mídia */}
      {mediaModal === 'image' && <MediaModal type="image" onClose={() => setMediaModal(null)} />}
      {mediaModal === 'video' && <MediaModal type="video" onClose={() => setMediaModal(null)} />}
      {mediaModal === 'audio' && <MediaModal type="audio" onClose={() => setMediaModal(null)} />}
      {mediaModal === 'file' && <MediaModal type="file" onClose={() => setMediaModal(null)} />}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6 pt-4">
        <Link href="/game/feed" className="text-white/50 hover:text-white transition-colors p-2 -ml-2">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Novo Artigo</h1>
      </div>

      <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 space-y-4">
        {/* Categoria */}
        <div>
          <label className="text-white/60 text-sm font-semibold block mb-1.5">Categoria</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-primary transition-colors"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Título */}
        <div>
          <label className="text-white/60 text-sm font-semibold block mb-1.5">Título</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Digite o título do artigo"
            className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Cor do Conteúdo */}
        <div>
          <label className="text-white/60 text-sm font-semibold block mb-1.5 flex items-center gap-2">
            <Palette size={16} /> Cor do Texto
          </label>
          <div className="flex flex-wrap gap-2">
            {textColorOptions.map((opt) => (
              <button
                key={opt.class}
                onClick={() => setContentColor(opt.class)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  contentColor === opt.class
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-white/60 hover:text-white/80'
                }`}
              >
                <span className={opt.class}>{opt.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div>
          <label className="text-white/60 text-sm font-semibold block mb-1.5">Conteúdo</label>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-1 mb-2 bg-[#0a0a0a] border border-white/10 rounded-xl p-2">
            <button onClick={insertBold} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Negrito">
              <Bold size={18} />
            </button>
            <button onClick={insertItalic} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Itálico">
              <Italic size={18} />
            </button>
            <button onClick={insertUnderline} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Sublinhado">
              <Underline size={18} />
            </button>

            <div className="w-px bg-white/10 mx-1" />

            <button onClick={insertHeading} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors text-xs font-bold" title="Título">
              H
            </button>
            <button onClick={insertQuote} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Citação">
              <FileText size={18} />
            </button>

            <div className="w-px bg-white/10 mx-1" />

            <button onClick={insertList} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Lista com marcadores">
              <List size={18} />
            </button>
            <button onClick={insertNumberedList} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Lista numerada">
              <ListOrdered size={18} />
            </button>

            <div className="w-px bg-white/10 mx-1" />

            <button onClick={() => setMediaModal('image')} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Inserir imagem">
              <Image size={18} />
            </button>
            <button onClick={() => setMediaModal('video')} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Inserir vídeo">
              <Video size={18} />
            </button>
            <button onClick={() => setMediaModal('audio')} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Inserir áudio">
              <Music size={18} />
            </button>
            <button onClick={() => setMediaModal('file')} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Inserir arquivo">
              <FileText size={18} />
            </button>
            <button onClick={insertLink} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Inserir link">
              <LinkIcon size={18} />
            </button>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Digite o conteúdo do artigo aqui..."
            className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-primary transition-colors resize-y min-h-[300px] font-mono text-sm"
          />
          <p className="text-white/20 text-xs mt-1">
            {form.content.length} caracteres • Sem limite de tamanho
          </p>
        </div>

        {/* ── PRÉ-VISUALIZAÇÃO RENDERIZADA ── */}
        {preview && (
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-sm font-semibold text-white/60 mb-2">📄 Pré-visualização</h3>
            <div className="bg-black/30 rounded-lg p-4 max-h-96 overflow-y-auto prose prose-invert prose-sm">
              <h2 className="text-xl font-bold text-white">{form.title || 'Título'}</h2>
              <p className="text-white/40 text-xs mb-2">{form.category || 'Categoria'}</p>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {form.content || 'O conteúdo do artigo aparecerá aqui...'}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-xl">{error}</p>}
        {success && <p className="text-green-400 text-sm text-center bg-green-500/10 p-3 rounded-xl">{success}</p>}

        {/* Botões */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => setPreview(!preview)}
            className="flex-1 min-w-[120px] bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Eye size={18} />
            {preview ? 'Ocultar Prévia' : 'Pré-visualizar'}
          </button>
          <button
            onClick={handlePublish}
            disabled={loading}
            className="flex-1 min-w-[120px] bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>

        <p className="text-white/20 text-xs text-center">
          Ao publicar, você concorda com os termos de uso do Labrador
        </p>
      </div>
    </div>
  )
}