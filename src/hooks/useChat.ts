import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

export interface ChatMessage {
  id: string
  country_id: number
  content: string
  media_url?: string | null
  media_type?: string | null
  created_at: string
  reply_to_id?: string | null
  reply_to_message?: {
    content: string
    country: { name: string; flag_emoji: string } | null
  } | null
  country: {
    name: string
    flag_emoji: string
  }
}

export function useChat() {
  const { country } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    try {
      setError(null)
      // 🔥 Busca sem a relação reply_to_message (se não existir)
      const { data, error: fetchError } = await supabase
        .from('chat_messages')
        .select(`
          id,
          country_id,
          content,
          image_url,
          video_url,
          gif_url,
          sticker_url,
          file_url,
          music_url,
          media_type,
          created_at,
          reply_to_id,
          countries ( name, flag_emoji )
        `)
        .order('created_at', { ascending: true })
        .limit(100)

      if (fetchError) {
        console.error('❌ Erro ao buscar mensagens:', fetchError)
        setError(fetchError.message)
        return
      }

      if (data) {
        // 🔥 Buscar reply_to_message separadamente se houver reply_to_id
        const replyIds = data
          .map(m => m.reply_to_id)
          .filter(id => id !== null && id !== undefined) as string[]

        let replyMap: Record<string, any> = {}
        if (replyIds.length > 0) {
          const { data: replies, error: replyError } = await supabase
            .from('chat_messages')
            .select(`
              id,
              content,
              countries ( name, flag_emoji )
            `)
            .in('id', replyIds)

          if (!replyError && replies) {
            replyMap = replies.reduce((acc: any, r: any) => {
              acc[r.id] = {
                content: r.content,
                country: r.countries || { name: 'Desconhecido', flag_emoji: '🌐' }
              }
              return acc
            }, {})
          }
        }

        setMessages(data.map((m: any) => ({
          ...m,
          media_url: m.image_url || m.video_url || m.gif_url || m.sticker_url || m.file_url || m.music_url || null,
          country: m.countries,
          reply_to_message: m.reply_to_id ? replyMap[m.reply_to_id] || null : null
        })))
      }
    } catch (err) {
      console.error('❌ Erro inesperado ao buscar mensagens:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar mensagens')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()

    if (!country?.id) return

    const channel = supabase
      .channel(`chat_${country.id}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `country_id=eq.${country.id}`
        },
        async (payload) => {
          try {
            // Buscar mensagem completa
            const { data: fullMsg, error: msgError } = await supabase
              .from('chat_messages')
              .select(`
                id, country_id, content, image_url, video_url, gif_url,
                sticker_url, file_url, music_url, media_type, created_at, reply_to_id,
                countries ( name, flag_emoji )
              `)
              .eq('id', payload.new.id)
              .single()

            if (msgError) {
              console.error('❌ Erro ao buscar mensagem completa:', msgError)
              return
            }

            if (fullMsg) {
              let reply_to_message = null
              if (fullMsg.reply_to_id) {
                const { data: reply } = await supabase
                  .from('chat_messages')
                  .select('content, countries ( name, flag_emoji )')
                  .eq('id', fullMsg.reply_to_id)
                  .single()
                reply_to_message = reply || null
              }

              setMessages(prev => [...prev, {
                ...fullMsg,
                media_url: fullMsg.image_url || fullMsg.video_url || fullMsg.gif_url || fullMsg.sticker_url || fullMsg.file_url || fullMsg.music_url || null,
                country: fullMsg.countries,
                reply_to_message: reply_to_message
              }])
            }
          } catch (err) {
            console.error('❌ Erro ao processar nova mensagem:', err)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [country?.id, fetchMessages])

  async function sendMessage(
    content: string,
    file?: File,
    reply_to_id?: string | null
  ): Promise<{ success: boolean; error?: string }> {
    if (!country?.id) {
      return { success: false, error: 'País não encontrado' }
    }
    if (!content.trim() && !file) {
      return { success: false, error: 'Mensagem vazia' }
    }

    let insertData: any = {
      country_id: country.id,
      content: content.trim() || null,
      reply_to_id: reply_to_id || null
    }

    if (file) {
      try {
        let mediaType: string
        let columnName: string

        if (file.type.startsWith('image/')) {
          mediaType = 'image'
          columnName = 'image_url'
        } else if (file.type.startsWith('video/')) {
          mediaType = 'video'
          columnName = 'video_url'
        } else if (file.type === 'image/gif') {
          mediaType = 'gif'
          columnName = 'gif_url'
        } else if (file.type.startsWith('audio/')) {
          mediaType = 'audio'
          columnName = 'music_url'
        } else {
          mediaType = 'file'
          columnName = 'file_url'
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `chat_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `chat/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file, { cacheControl: '3600', upsert: false })

        if (uploadError) {
          return { success: false, error: `Erro no upload: ${uploadError.message}` }
        }

        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(filePath)

        insertData[columnName] = urlData.publicUrl
        insertData.media_type = mediaType
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Erro no upload' }
      }
    }

    try {
      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert(insertData)

      if (insertError) {
        return { success: false, error: insertError.message }
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao enviar mensagem' }
    }
  }

  return {
    messages,
    loading,
    error,
    sendMessage
  }
}