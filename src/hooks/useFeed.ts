import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { Database } from '@/types/database'

// ─── TIPOS DERIVADOS DO BANCO ──────────────────────────────
type ArticleRow = Database['public']['Tables']['articles']['Row']
type CommentRow = Database['public']['Tables']['comments']['Row']
type CountryRow = Database['public']['Tables']['countries']['Row']

export interface Article extends ArticleRow {
  countries: Pick<CountryRow, 'name' | 'flag_emoji'>
  user_vote?: 1 | -1 | null
}

export interface Comment extends CommentRow {
  countries: Pick<CountryRow, 'name' | 'flag_emoji'>
}

export const CATEGORIES = [
  'Governança', 'Política', 'Economia', 'Social',
  'Ambiental', 'Moda', 'Anúncio', 'Humor', 'Militar',
]

type PostCommentResult = {
  success: boolean
  message?: string
  error?: string
}

export function useFeed() {
  const { country, user } = useAuthStore()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_SIZE = 10

  // ─── BUSCAR ARTIGOS ─────────────────────────────────────────
  const fetchArticles = useCallback(async (reset = false) => {
    const from = reset ? 0 : page * PAGE_SIZE
    setLoading(true)

    const { data, error } = await supabase
      .from('articles')
      .select('*, countries(name, flag_emoji)')
      .order('likes', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error('Erro ao buscar artigos:', error)
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setLoading(false)
      setHasMore(false)
      return
    }

    // Busca votos do usuário
    let votedMap: Record<string, 1 | -1> = {}
    if (user?.id) {
      const ids = data.map((a: any) => a.id)
      const { data: votes } = await supabase
        .from('article_votes')
        .select('article_id, vote')
        .eq('user_id', user.id)
        .in('article_id', ids)

      votes?.forEach((v: any) => {
        votedMap[v.article_id] = v.vote as 1 | -1
      })
    }

    const mapped = data.map((a: any) => ({
      ...a,
      user_vote: votedMap[a.id] ?? null,
    }))

    setArticles(prev => reset ? mapped : [...prev, ...mapped])
    setHasMore(data.length === PAGE_SIZE)
    if (!reset) setPage(p => p + 1)
    setLoading(false)
  }, [page, user?.id])

  useEffect(() => {
    fetchArticles(true)
  }, [fetchArticles])

  // ─── VOTAR ──────────────────────────────────────────────────
  const voteArticle = useCallback(async (articleId: string, vote: 1 | -1) => {
    if (!user?.id) return

    const { error } = await supabase.rpc('vote_article', {
      p_user_id: user.id,
      p_article_id: articleId,
      p_vote: vote,
    })

    if (error) {
      console.error('Erro ao votar:', error)
      return
    }

    setArticles(prev =>
      prev.map(a => {
        if (a.id !== articleId) return a
        const prevVote = a.user_vote
        let likes = a.likes
        let dislikes = a.dislikes

        if (prevVote === vote) {
          if (vote === 1) likes--
          else dislikes--
          return { ...a, likes, dislikes, user_vote: null }
        }
        if (prevVote === 1) likes--
        else if (prevVote === -1) dislikes--
        if (vote === 1) likes++
        else dislikes++
        return { ...a, likes, dislikes, user_vote: vote }
      })
    )
  }, [user?.id])

  // ─── PUBLICAR ARTIGO ──────────────────────────────────────
  const publishArticle = useCallback(async (
    title: string,
    content: string,
    category: string,
    mediaData?: {
      image_url?: string | null
      video_url?: string | null
      file_url?: string | null
      media_type?: string | null
    }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!country?.id) return { success: false, error: 'País não encontrado' }

    const { error } = await supabase.from('articles').insert({
      country_id: country.id,
      title,
      content,
      category,
      image_url: mediaData?.image_url || null,
      video_url: mediaData?.video_url || null,
      file_url: mediaData?.file_url || null,
      media_type: mediaData?.media_type || null,
      likes: 0,
      dislikes: 0,
    })

    if (error) {
      console.error('Erro ao publicar artigo:', error)
      return { success: false, error: error.message }
    }

    await fetchArticles(true)
    return { success: true }
  }, [country?.id, fetchArticles])

  // ─── EDITAR ARTIGO ─────────────────────────────────────────
  const updateArticle = useCallback(async (
    articleId: string,
    title: string,
    content: string,
    category: string,
    mediaData?: {
      image_url?: string | null
      video_url?: string | null
      file_url?: string | null
      media_type?: string | null
    }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!country?.id) return { success: false, error: 'País não encontrado' }

    const { data: check, error: checkError } = await supabase
      .from('articles')
      .select('country_id')
      .eq('id', articleId)
      .single()

    if (checkError || check?.country_id !== country.id) {
      return { success: false, error: 'Você só pode editar seus próprios artigos' }
    }

    const { error } = await supabase
      .from('articles')
      .update({
        title,
        content,
        category,
        image_url: mediaData?.image_url ?? null,
        video_url: mediaData?.video_url ?? null,
        file_url: mediaData?.file_url ?? null,
        media_type: mediaData?.media_type ?? null,
      })
      .eq('id', articleId)

    if (error) {
      console.error('Erro ao editar artigo:', error)
      return { success: false, error: error.message }
    }

    await fetchArticles(true)
    return { success: true }
  }, [country?.id, fetchArticles])

  // ─── DELETAR ARTIGO ────────────────────────────────────────
  const deleteArticle = useCallback(async (
    articleId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!country?.id) return { success: false, error: 'País não encontrado' }

    const { data: check, error: checkError } = await supabase
      .from('articles')
      .select('country_id')
      .eq('id', articleId)
      .single()

    if (checkError || check?.country_id !== country.id) {
      return { success: false, error: 'Você só pode deletar seus próprios artigos' }
    }

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId)

    if (error) {
      console.error('Erro ao deletar artigo:', error)
      return { success: false, error: error.message }
    }

    await fetchArticles(true)
    return { success: true }
  }, [country?.id, fetchArticles])

  // ─── COMENTÁRIOS ───────────────────────────────────────────
  const fetchComments = useCallback(async (articleId: string): Promise<Comment[]> => {
    console.log('📡 [useFeed] fetchComments para articleId:', articleId)
    
    const { data, error } = await supabase
      .from('comments')
      .select('*, countries(name, flag_emoji)')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ [useFeed] Erro ao buscar comentários:', error)
      return []
    }

    console.log('✅ [useFeed] Comentários recebidos:', data?.length || 0)
    return (data || []) as Comment[]
  }, [])

  // ✅ VERSÃO CORRIGIDA DEFINITIVA: Permite enviar Mídia sem texto!
  const postComment = useCallback(async (
    articleId: string,
    content: string,
    parentId?: string,
    mediaData?: {
      gif_url?: string | null
      sticker_url?: string | null
      image_url?: string | null
    }
  ): Promise<PostCommentResult> => {
    console.log('💬 [useFeed] postComment() chamado:', { articleId, content, parentId })

    if (!country?.id) return { success: false, error: 'País não encontrado. Faça login novamente.' }
    if (!articleId) return { success: false, error: 'Artigo não encontrado.' }

    // ✅ AQUI ESTÁ A CORREÇÃO: Verifica se tem mídia antes de bloquear texto vazio
    const hasMedia = !!(mediaData?.gif_url || mediaData?.sticker_url || mediaData?.image_url)
    if (!content.trim() && !hasMedia) {
      return { success: false, error: 'O comentário não pode estar vazio.' }
    }

    const insertData: any = {
      article_id: articleId,
      country_id: country.id,
      content: content.trim(),
      parent_id: parentId ?? null,
    }

    if (mediaData?.gif_url) insertData.gif_url = mediaData.gif_url
    if (mediaData?.sticker_url) insertData.sticker_url = mediaData.sticker_url
    if (mediaData?.image_url) insertData.image_url = mediaData.image_url

    console.log('📝 [useFeed] Dados para inserir:', insertData)

    const { data, error } = await supabase
      .from('comments')
      .insert(insertData)
      .select()

    if (error) {
      console.error('❌ [useFeed] Erro ao inserir comentário:', error)
      return { success: false, error: `Erro ao postar comentário: ${error.message}` }
    }

    console.log('✅ [useFeed] Comentário inserido com sucesso:', data)
    return { success: true, message: 'Comentário postado com sucesso!' }
  }, [country?.id])

  return {
    articles,
    loading,
    hasMore,
    loadMore: () => fetchArticles(false),
    voteArticle,
    publishArticle,
    updateArticle,
    deleteArticle,
    fetchComments,
    postComment,
  }
}