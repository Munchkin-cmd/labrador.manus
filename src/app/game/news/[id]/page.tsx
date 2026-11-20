'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'

type NewspaperData = {
  id: string
  title: string
  subtitle: string
  content: string
  image_url: string | null
  option_1_text: string
  option_2_text: string
  option_3_text: string
}

export default function ReadNewspaperPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { country } = useAuthStore()
  const [news, setNews] = useState<NewspaperData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadNews() {
      const { data } = await supabase
        .from('country_newspapers')
        .select('newspapers(id, title, subtitle, content, image_url, option_1_text, option_2_text, option_3_text)')
        .eq('id', resolvedParams.id)
        .single()
      
      if (data) setNews(data.newspapers as unknown as NewspaperData)
      setLoading(false)
    }
    loadNews()
  }, [resolvedParams.id])

  const handleChoice = async (option: number) => {
    if (!country?.id || !news) return
    setSubmitting(true)

    const { data } = await supabase.rpc('resolve_newspaper_choice', {
      p_country_newspaper_id: resolvedParams.id,
      p_option_chosen: option
    })

    const result = data as { success: boolean, message?: string, error?: string }

    if (result.success) {
      alert('Sua decisão foi tomada e os efeitos aplicados ao país!')
      router.push('/game/news')
    } else {
      alert(result.error || 'Erro ao tomar decisão.')
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-white p-10 text-center">Lendo os arquivos confidenciais...</div>
  if (!news) return <div className="text-white p-10 text-center">Jornal não encontrado.</div>

  return (
    <div className="max-w-3xl mx-auto p-6 text-white bg-slate-900 min-h-screen">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700">
        <h1 className="text-4xl font-serif font-bold mb-2 text-center">{news.title}</h1>
        <h2 className="text-xl text-gray-400 italic text-center mb-6">{news.subtitle}</h2>
        
        {news.image_url && (
          <img src={news.image_url} alt="Notícia" className="w-full h-64 object-cover rounded mb-6 border-4 border-slate-700" />
        )}

        <div className="prose prose-invert max-w-none text-gray-300 mb-8 whitespace-pre-wrap">
          {news.content}
        </div>

        <h3 className="text-2xl font-bold text-center border-t border-slate-700 pt-6 mb-4">Como o governo reagirá?</h3>
        
        <div className="space-y-3">
          <button disabled={submitting} onClick={() => handleChoice(1)} className="w-full bg-slate-700 hover:bg-slate-600 p-4 rounded text-left transition-colors border border-slate-600 hover:border-blue-400">
            <span className="font-bold text-blue-400 mr-2">Opção A:</span> {news.option_1_text}
          </button>
          <button disabled={submitting} onClick={() => handleChoice(2)} className="w-full bg-slate-700 hover:bg-slate-600 p-4 rounded text-left transition-colors border border-slate-600 hover:border-green-400">
            <span className="font-bold text-green-400 mr-2">Opção B:</span> {news.option_2_text}
          </button>
          <button disabled={submitting} onClick={() => handleChoice(3)} className="w-full bg-slate-700 hover:bg-slate-600 p-4 rounded text-left transition-colors border border-slate-600 hover:border-yellow-400">
            <span className="font-bold text-yellow-400 mr-2">Opção C:</span> {news.option_3_text}
          </button>
        </div>
      </div>
    </div>
  )
}