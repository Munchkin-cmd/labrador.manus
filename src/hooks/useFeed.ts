import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

export interface Article {
  id: string
  country_id: number
  title: string
  content: string
  category: string
  image_url: string | null
  video_url: string | null
  file_url: string | null
  media_type: string | null
  likes: number
  dislikes: number
  created_at: string
  countries: { name: string; flag_emoji: string }
  user_vote?: 1 | -1 | null
}

export interface Comment {
  id: string
  country_id: number
  parent_id: string | null
  content: string
  gif_url: string | null      // ✅ ADICIONADO
  sticker_url: string | null  // ✅ ADICIONADO
  likes: number
  dislikes: number
  created_at: string
  countries: { name: string; flag_emoji: string }
}

export const CATEGORIES = [
  'Governança','Política','Economia','Social',
  'Ambiental','Moda','Anúncio','Humor','Militar',
]

export function useFeed() {
  const { country, user } = useAuthStore()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(0)
  const [hasMore, setHasMore]   = useState(true)
  const PAGE_SIZE = 10

  const fetchArticles = useCallback(async (reset = false) => {
    const from = reset ? 0 : page * PAGE_SIZE
    setLoading(true)

    const { data } = await supabase
      .from('articles')
      .select('*, countries(name, flag_emoji)')
      .order('likes', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (!data) { setLoading(false); return }

    let votedMap: Record<string, 1 | -1> = {}
    if (user?.id) {
      const ids = data.map(a => a.id)
      const { data: votes } = await supabase
        .from('article_votes')
        .select('article_id, vote')
        .eq('user_id', user.id)
        .in('article_id', ids)
      
      votes?.forEach(v => { votedMap[v.article_id] = v.vote as 1 | -1; })
    }

    const mapped = data.map(a => ({ ...a, user_vote: votedMap[a.id] ?? null }))
    setArticles(prev => reset ? mapped : [...prev, ...mapped])
    setHasMore(data.length === PAGE_SIZE)
    if (!reset) setPage(p => p + 1)
    setLoading(false)
  }, [page, user?.id])

  useEffect(() => { 
    fetchArticles(true) 
  }, [fetchArticles])

  async function voteArticle(articleId: string, vote: 1 | -1) {
    if (!user?.id) return
    const { data } = await supabase.rpc('vote_article', {
      p_user_id: user.id,
      p_article_id: articleId,
      p_vote: vote,
    })
    setArticles(prev => prev.map(a => {
      if (a.id !== articleId) return a
      const prev_vote = a.user_vote
      let likes = a.likes, dislikes = a.dislikes
      if (prev_vote === vote) {
        if (vote === 1) likes--; else dislikes--
        return { ...a, likes, dislikes, user_vote: null }
      }
      if (prev_vote === 1) likes--
      if (prev_vote === -1) dislikes--
      if (vote === 1) likes++; else dislikes++
      return { ...a, likes, dislikes, user_vote: vote }
    }))
  }

  async function publishArticle(
    title: string,
    content: string,
    category: string,
    mediaData?: {
      image_url?: string | null
      video_url?: string | null
      file_url?: string | null
      media_type?: string | null 
    }
  ) {
    if (!country?.id) return { success: false }
    
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
    
    if (!error) fetchArticles(true)
    return { success: !error, error: error?.message }
  }

  async function updateArticle(
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
  ) {
    if (!country?.id) return { success: false, error: 'Você precisa estar logado em um país' }

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
        image_url: mediaData?.image_url || null,
        video_url: mediaData?.video_url || null,
        file_url: mediaData?.file_url || null,
        media_type: mediaData?.media_type || null,
      })
      .eq('id', articleId)

    if (!error) fetchArticles(true)
    return { success: !error, error: error?.message }
  }

  async function deleteArticle(articleId: string) {
    if (!country?.id) return { success: false, error: 'Você precisa estar logado em um país' }

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

    if (!error) fetchArticles(true)
    return { success: !error, error: error?.message }
  }

  // ─── COMENTÁRIOS COM GIF E STICKER ──────────────────────

  async function fetchComments(articleId: string): Promise<Comment[]> {
    const { data } = await supabase
      .from('comments')
      .select('*, countries(name, flag_emoji)')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true })
    return (data as any) ?? []
  }

  async function postComment(
    articleId: string,
    content: string,
    parentId?: string,
    mediaData?: {
      gif_url?: string | null
      sticker_url?: string | null
    }
  ) {
    if (!country?.id) return

    const insertData: any = {
      article_id: articleId,
      country_id: country.id,
      content,
      parent_id: parentId ?? null,
    }

    if (mediaData?.gif_url) insertData.gif_url = mediaData.gif_url
    if (mediaData?.sticker_url) insertData.sticker_url = mediaData.sticker_url

    await supabase.from('comments').insert(insertData)
  }

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