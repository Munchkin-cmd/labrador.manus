'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat, ChatMessage } from '@/hooks/useChat'
import { formatTime } from '@/utils/format'
import {
  Image, Video, Music, Link2, Send,
  Mic, Gift, Reply, X, FileText
} from 'lucide-react'

import { GiphyFetch } from '@giphy/js-fetch-api'
import { Grid } from '@giphy/react-components'

const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY || '')

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
      const result = await sendMessage(
        text.trim(),
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

  function openFileSelector(type: string) {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type
      fileInputRef.current.click()
    }
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
      <p className="text-xs font-bold tracking-widest text-white/40 uppercase">CHAT GLOBAL</p>

      <div className="bg-surface-card rounded-xl overflow-hidden border border-white/5">
        <div className="h-64 overflow-y-auto p-3 flex flex-col gap-2 scroll-smooth">
          {loading && <div className="flex-1 flex items-center justify-center text-white/30 text-sm">Carregando...</div>}
          {!loading && messages.length === 0 && <div className="flex-1 flex items-center justify-center text-white/20 text-sm">Nenhuma mensagem ainda. Seja o primeiro!</div>}
          {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} onReply={handleReply} />)}
          <div ref={bottomRef} />
        </div>

        {replyTo && (
          <div className="border-t border-primary/20 bg-primary/5 px-3 py-2 flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <Reply size={14} className="text-primary-light flex-shrink-0" />
                <span className="text-white/50 text-xs">Respondendo a <span className="text-white/70 font-medium">{replyTo.country?.name || 'Desconhecido'}</span></span>
              </div>
              <span className="text-white/30 text-xs truncate max-w-[200px]">
                “{replyTo.content.slice(0, 40)}...”
              </span>
            </div>
            <button onClick={cancelReply} className="text-white/30 hover:text-white/70 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="border-t border-white/5 p-2 flex flex-col gap-2">
          {/* Exibe preview do GIF selecionado */}
          {selectedGif && (
            <div className="relative bg-black/40 rounded-lg overflow-hidden max-h-32 max-w-full">
              <img src={selectedGif.url} alt="GIF" className="w-full h-full object-contain max-h-32" />
              <button
                onClick={() => setSelectedGif(null)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {mediaPreview && (
            <div className="relative bg-black/40 rounded-lg overflow-hidden max-h-32 max-w-full">
              <img src={mediaPreview} alt="Preview" className="w-full h-full object-contain max-h-32" />
              <button onClick={() => { setSelectedFile(null); setMediaPreview(null); }} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5">
                <X size={16} />
              </button>
            </div>
          )}

          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />

          <div className="flex items-center gap-1 px-1">
            <button
              onClick={() => setShowGifModal(true)}
              className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Gift size={18} />
            </button>
            <button onClick={() => openFileSelector('image/*')} className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"><Image size={18} /></button>
            <button onClick={() => openFileSelector('video/*')} className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"><Video size={18} /></button>
            <button onClick={() => openFileSelector('audio/*')} className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"><Music size={18} /></button>
            <button onClick={() => openFileSelector('*/*')} className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"><FileText size={18} /></button>
            <button className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"><Link2 size={18} /></button>
            <button className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"><Mic size={18} /></button>
            <div className="flex-1" />
            <button onClick={handleSend} disabled={(!text.trim() && !selectedFile && !selectedGif) || sending} className="bg-primary hover:bg-primary-light disabled:opacity-30 transition-colors text-white rounded-lg p-1.5">
              <Send size={18} />
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
            className="w-full bg-surface-input rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Modal GIF */}
      {showGifModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">🎨 Escolher GIF ou Sticker</h3>
              <button onClick={() => setShowGifModal(false)} className="text-white/40 hover:text-white/70 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setGifTab('gifs')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${gifTab === 'gifs' ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:text-white/60'}`}
              >
                GIFs
              </button>
              <button
                onClick={() => setGifTab('stickers')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${gifTab === 'stickers' ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:text-white/60'}`}
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
                onGifClick={(gif, e) => {
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

// ── MessageBubble ──
function MessageBubble({ msg, onReply }: { msg: ChatMessage; onReply: (msg: ChatMessage) => void }) {
  return (
    <div className="flex items-start gap-2 group hover:bg-white/5 rounded-lg px-2 py-1 transition-colors">
      <span className="text-base flex-shrink-0 mt-0.5">{msg.country?.flag_emoji ?? '🌐'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-white/70 truncate max-w-[120px]">{msg.country?.name ?? 'Desconhecido'}</span>
          <span className="text-white/20 text-xs flex-shrink-0">{formatTime(msg.created_at)}</span>
        </div>

        {msg.media_url && (
          <div className="mt-2 max-w-[200px] rounded-lg overflow-hidden">
            {(msg.media_type === 'image' || msg.media_type === 'gif' || msg.media_type === 'sticker') && (
              <img src={msg.media_url} alt={msg.media_type || 'Mídia'} className="w-full h-auto object-cover" />
            )}
            {msg.media_type === 'video' && <video src={msg.media_url} controls className="w-full h-auto object-cover" />}
            {msg.media_type === 'audio' && <audio src={msg.media_url} controls className="w-full mt-2" />}
            {msg.media_type === 'file' && <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-light text-xs bg-white/5 rounded-lg p-2 hover:bg-white/10 transition-colors"><FileText size={14} /> Baixar arquivo</a>}
          </div>
        )}

        <p className="text-white/80 text-sm break-words leading-snug">{msg.content}</p>

        {msg.reply_to_message && (
          <div className="mt-1 pl-2 border-l-2 border-white/20 bg-white/5 rounded p-1.5 text-[10px] text-white/50">
            <span className="font-semibold">{msg.reply_to_message.country?.name || 'Desconhecido'}: </span>
            <span className="italic">“{msg.reply_to_message.content.slice(0, 60)}...”</span>
          </div>
        )}

        <button onClick={() => onReply(msg)} className="text-[10px] text-white/20 hover:text-primary-light transition-colors mt-0.5 opacity-0 group-hover:opacity-100">Responder</button>
      </div>
    </div>
  )
}