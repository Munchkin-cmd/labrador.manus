'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat, ChatMessage } from '@/hooks/useChat'
import { formatTime } from '@/utils/format'
import {
  Image, Video, Music, Link2, Send,
  Mic, Gift, Reply, X, FileText, Paperclip
} from 'lucide-react'

import { GiphyFetch } from '@giphy/js-fetch-api'
import { Grid } from '@giphy/react-components'

const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY || '')

// ─── COMPONENTE DE PRÉVIA DE LINK ──────────────────────────
function LinkPreview({ url }: { url: string }) {
  const [preview, setPreview] = useState<{
    title?: string
    description?: string
    image?: string
    site?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
          const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/)?.[1]
          if (videoId) {
            setPreview({
              title: 'Vídeo do YouTube',
              description: 'Clique para assistir',
              image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
              site: 'YouTube',
            })
            setLoading(false)
            return
          }
        }
        setPreview({
          title: url,
          description: 'Clique para abrir o link',
          site: new URL(url).hostname,
        })
      } catch (e) {
        console.error('Erro ao buscar preview:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchPreview()
  }, [url])

  if (loading) return <div className="animate-pulse bg-surface-input border border-surface-border h-16 rounded-lg" />
  if (!preview) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 bg-surface-input rounded-lg overflow-hidden border border-surface-border hover:border-primary/40 hover:bg-[#1A263F] transition-colors"
    >
      {preview.image && (
        <img src={preview.image} alt={preview.title || 'Preview'} className="w-full h-32 object-cover" />
      )}
      <div className="p-2">
        {preview.site && <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest">{preview.site}</p>}
        <p className="text-white/90 text-sm font-semibold mt-0.5">{preview.title || url}</p>
        {preview.description && (
          <p className="text-white/50 text-[10px] font-mono line-clamp-2 mt-1">{preview.description}</p>
        )}
      </div>
    </a>
  )
}

export default function GlobalChat() {
  const { messages, loading, error, sendMessage } = useChat()
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedGif, setSelectedGif] = useState<{ url: string; type: 'gif' | 'sticker' } | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const [showGifModal, setShowGifModal] = useState(false)
  const [gifSearch, setGifSearch] = useState('')
  const [gifTab, setGifTab] = useState<'gifs' | 'stickers'>('gifs')

  const [showClipsMenu, setShowClipsMenu] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => { if (mediaPreview) URL.revokeObjectURL(mediaPreview) }
  }, [mediaPreview])

  const selectGif = (url: string, type: 'gif' | 'sticker' = 'gif') => {
    setSelectedGif({ url, type })
    setShowGifModal(false)
    setGifSearch('')
    inputRef.current?.focus()
  }

  async function handleSend() {
    if (!text.trim() && !selectedFile && !selectedGif) return
    if (sending) return

    setSending(true)
    try {
      const content = text.trim() || ' '

      const result = await sendMessage(
        content,
        selectedFile || undefined,
        replyTo?.id || null,
        selectedGif?.url,
        selectedGif?.type || 'gif'
      )

      if (result.success) {
        setText('')
        setSelectedFile(null)
        setMediaPreview(null)
        setSelectedGif(null)
        setReplyTo(null)
        inputRef.current?.focus()
      } else {
        alert('Erro ao enviar: ' + result.error)
      }
    } catch (err) {
      alert('Erro ao enviar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setSending(false)
    }
  }

  function handleReply(msg: ChatMessage) {
    setReplyTo(msg)
    inputRef.current?.focus()
  }
  function cancelReply() { setReplyTo(null) }

  function openFileSelector(accept: string) {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept
      fileInputRef.current.click()
    }
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

  return (
    <div className="px-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 pl-1">
        <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
        <p className="text-xs font-bold tracking-widest text-white uppercase">Chat Global</p>
      </div>

      {/* ✅ Container Principal Sólido */}
      <div className="bg-surface-card rounded-xl overflow-hidden border border-surface-border shadow-lg">
        
        {/* Área de Mensagens */}
        <div className="h-64 overflow-y-auto p-3 flex flex-col gap-2 scroll-smooth custom-scrollbar">
          {loading && <div className="flex-1 flex items-center justify-center text-white/40 text-[10px] font-mono uppercase tracking-widest">Carregando...</div>}
          {!loading && messages.length === 0 && <div className="flex-1 flex items-center justify-center text-white/30 text-[10px] font-mono uppercase tracking-widest">Nenhuma mensagem ainda. Seja o primeiro!</div>}
          {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} onReply={handleReply} />)}
          <div ref={bottomRef} />
        </div>

        {/* Banner de Resposta */}
        {replyTo && (
          <div className="border-t border-surface-border bg-surface-input px-3 py-2 flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <Reply size={14} className="text-primary flex-shrink-0" />
                <span className="text-white/60 text-[10px] font-mono uppercase tracking-widest">Respondendo a <span className="text-primary font-bold">{replyTo.country?.name || 'Desconhecido'}</span></span>
              </div>
              <span className="text-white/40 text-[10px] font-mono truncate max-w-[200px] mt-0.5">
                “{replyTo.content.slice(0, 40)}...”
              </span>
            </div>
            <button onClick={cancelReply} className="text-white/40 hover:text-red-400 transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Área de Input e Ações */}
        <div className="border-t border-surface-border p-2 flex flex-col gap-2 bg-surface-card">
          
          {/* Preview de GIF */}
          {selectedGif && (
            <div className="relative bg-surface-input border border-surface-border rounded-lg overflow-hidden max-h-32 max-w-full">
              <img src={selectedGif.url} alt="GIF" className="w-full h-full object-contain max-h-32" />
              <button
                onClick={() => setSelectedGif(null)}
                className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Preview de Arquivo */}
          {mediaPreview && (
            <div className="relative bg-surface-input border border-surface-border rounded-lg overflow-hidden max-h-32 max-w-full">
              <img src={mediaPreview} alt="Preview" className="w-full h-full object-contain max-h-32" />
              <button onClick={() => { setSelectedFile(null); setMediaPreview(null); }} className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-1 transition-colors">
                <X size={14} />
              </button>
            </div>
          )}

          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

          <div className="flex items-center gap-1 px-1 relative">
            <div className="relative">
              <button
                onClick={() => setShowClipsMenu(!showClipsMenu)}
                className="p-1.5 text-white/50 hover:text-white bg-surface-input hover:bg-surface-border border border-surface-border rounded-md transition-colors"
              >
                <Paperclip size={16} />
              </button>

              {showClipsMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-surface-card border border-surface-border rounded-xl p-1 shadow-2xl z-20 w-48">
                  <button
                    onClick={() => openFileSelector('image/*')}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs font-mono text-white/70 hover:text-white hover:bg-surface-input rounded-lg transition-colors uppercase tracking-widest"
                  >
                    <Image size={16} /> Imagem
                  </button>
                  <button
                    onClick={() => openFileSelector('video/*')}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs font-mono text-white/70 hover:text-white hover:bg-surface-input rounded-lg transition-colors uppercase tracking-widest"
                  >
                    <Video size={16} /> Vídeo
                  </button>
                  <button
                    onClick={() => openFileSelector('audio/*')}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs font-mono text-white/70 hover:text-white hover:bg-surface-input rounded-lg transition-colors uppercase tracking-widest"
                  >
                    <Music size={16} /> Áudio
                  </button>
                  <button
                    onClick={() => openFileSelector('*/*')}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs font-mono text-white/70 hover:text-white hover:bg-surface-input rounded-lg transition-colors uppercase tracking-widest"
                  >
                    <FileText size={16} /> Arquivo
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowGifModal(true)}
              className="p-1.5 text-white/50 hover:text-white bg-surface-input hover:bg-surface-border border border-surface-border rounded-md transition-colors"
            >
              <Gift size={16} />
            </button>

            <div className="flex-1" />

            <button 
              onClick={handleSend} 
              disabled={(!text.trim() && !selectedFile && !selectedGif) || sending} 
              className="bg-primary hover:bg-primary-dark disabled:opacity-30 transition-colors text-white rounded-md p-2 shadow-lg shadow-primary/20"
            >
              <Send size={16} />
            </button>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={replyTo ? 'Escreva sua resposta...' : 'Enviar mensagem...'}
            maxLength={300}
            disabled={sending}
            className="w-full bg-surface-input border border-surface-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-primary transition-colors font-mono"
          />
        </div>
      </div>

      {/* ─── MODAL DE GIF ────────────────────────────────────── */}
      {showGifModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card border border-surface-border rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold uppercase tracking-widest font-mono text-sm flex items-center gap-2">
                <Gift size={16} className="text-primary"/> Escolher GIF ou Sticker
              </h3>
              <button onClick={() => setShowGifModal(false)} className="text-white/40 hover:text-white transition-colors bg-surface-input p-1 rounded-md border border-surface-border">
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setGifTab('gifs')}
                className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest rounded-lg border transition-colors ${gifTab === 'gifs' ? 'bg-primary border-primary text-white font-bold' : 'bg-surface-input border-surface-border text-white/40 hover:text-white'}`}
              >
                GIFs
              </button>
              <button
                onClick={() => setGifTab('stickers')}
                className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest rounded-lg border transition-colors ${gifTab === 'stickers' ? 'bg-primary border-primary text-white font-bold' : 'bg-surface-input border-surface-border text-white/40 hover:text-white'}`}
              >
                Stickers
              </button>
            </div>

            <div className="h-80 overflow-y-auto -mx-2 px-2 custom-scrollbar">
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

            <div className="flex gap-2 mt-4">
              <input
                type="text"
                value={gifSearch}
                onChange={(e) => setGifSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setGifTab(gifTab)}
                placeholder="Buscar GIF..."
                className="flex-1 bg-[#0A0F1C] border border-surface-border text-white px-4 py-2 rounded-lg focus:outline-none focus:border-primary transition-colors text-sm font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── COMPONENTE DE MENSAGEM ──
function MessageBubble({ msg, onReply }: { msg: ChatMessage; onReply: (msg: ChatMessage) => void }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const links: string[] = []
  let match
  while ((match = urlRegex.exec(msg.content)) !== null) {
    links.push(match[0])
  }

  let contentParts: string[] = []
  let lastIndex = 0
  urlRegex.lastIndex = 0
  let m
  while ((m = urlRegex.exec(msg.content)) !== null) {
    const linkStart = m.index
    const linkEnd = linkStart + m[0].length
    if (linkStart > lastIndex) {
      contentParts.push(msg.content.substring(lastIndex, linkStart))
    }
    contentParts.push(m[0])
    lastIndex = linkEnd
  }
  if (lastIndex < msg.content.length) {
    contentParts.push(msg.content.substring(lastIndex))
  }

  const userData = msg.country?.users;
  const flagUrl = Array.isArray(userData) ? userData[0]?.flag_url : userData?.flag_url;

  return (
    <div className="flex items-start gap-2 group hover:bg-surface-input rounded-lg px-2 py-1.5 transition-colors border border-transparent hover:border-surface-border">
      
      {/* Avatar da Bandeira */}
      <div className="w-8 h-8 rounded-full overflow-hidden border border-surface-border shrink-0 mt-0.5 flex items-center justify-center bg-surface-input">
        {flagUrl ? (
          <img
            src={flagUrl}
            alt={msg.country?.name || 'Bandeira'}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-base leading-none">{msg.country?.flag_emoji ?? '🌐'}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-white uppercase tracking-wider truncate max-w-[150px]">{msg.country?.name ?? 'Desconhecido'}</span>
          <span className="text-white/30 text-[9px] font-mono flex-shrink-0">{formatTime(msg.created_at)}</span>
        </div>

        {msg.media_url && (
          <div className="mt-2 max-w-[200px] rounded-lg overflow-hidden border border-surface-border">
            {(msg.media_type === 'image' || msg.media_type === 'gif' || msg.media_type === 'sticker') && (
              <img src={msg.media_url} alt={msg.media_type || 'Mídia'} className="w-full h-auto object-cover" />
            )}
            {msg.media_type === 'video' && <video src={msg.media_url} controls className="w-full h-auto object-cover" />}
            {msg.media_type === 'audio' && <audio src={msg.media_url} controls className="w-full mt-2" />}
            {msg.media_type === 'file' && (
              <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary text-[10px] font-mono uppercase bg-surface-input rounded p-2 hover:bg-surface-border transition-colors">
                <FileText size={14} /> Baixar arquivo
              </a>
            )}
          </div>
        )}

        {msg.content && msg.content.trim() && (
          <p className="text-white/80 text-sm break-words leading-snug mt-1 font-sans">
            {contentParts.map((part, i) => {
              const isLink = /^https?:\/\//.test(part)
              if (isLink) {
                return (
                  <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {part}
                  </a>
                )
              }
              return part
            })}
          </p>
        )}

        {links.length > 0 && (
          <div className="mt-2">
            {links.map((link, idx) => (
              <LinkPreview key={idx} url={link} />
            ))}
          </div>
        )}

        {msg.reply_to_message && (
          <div className="mt-1.5 pl-2 border-l-2 border-primary/50 bg-surface-input border-t border-r border-b border-surface-border rounded-r p-1.5 text-[10px] text-white/50 font-mono">
            <span className="font-bold text-primary">{msg.reply_to_message.country?.name || 'Desconhecido'}: </span>
            <span className="italic">“{msg.reply_to_message.content.slice(0, 60)}...”</span>
          </div>
        )}

        <button onClick={() => onReply(msg)} className="text-[9px] font-mono text-white/30 hover:text-primary uppercase tracking-widest transition-colors mt-1 opacity-0 group-hover:opacity-100 flex items-center gap-1">
          <Reply size={10} /> Responder
        </button>
      </div>
    </div>
  )
}