'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type NewspaperBasic = { id: string, title: string, subtitle: string, image_url: string | null }
type CountryNewspaper = {
  id: string
  read_at: string | null
  newspaper_id: string
  newspapers: NewspaperBasic
}

export default function NewsHubPage() {
  const { country } = useAuthStore()
  const router = useRouter()
  const [unreadNews, setUnreadNews] = useState<CountryNewspaper | null>(null)
  const [history, setHistory] = useState<CountryNewspaper[]>([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)

  const fetchNews = async () => {
    if (!country?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('country_newspapers')
      .select('id, read_at, newspaper_id, newspapers(id, title, subtitle, image_url)')
      .eq('country_id', country.id)
      .order('delivered_at', { ascending: false })

    if (data) {
      const unread = data.find(n => n.read_at === null)
      setUnreadNews((unread as unknown as CountryNewspaper) || null)
      setHistory(data.filter(n => n.read_at !== null) as unknown as CountryNewspaper[])
    }
    setLoading(false)
  }

  useEffect(() => { fetchNews() }, [country?.id])

  const requestNewspaper = async () => {
    if (!country?.id) return
    setRequesting(true)
    const { data } = await supabase.rpc('request_daily_newspaper', { p_country_id: country.id })
    const res = data as { success: boolean, error?: string }
    
    if (res.success) {
      await fetchNews()
    } else {
      alert(res.error || 'Erro ao pedir jornal.')
    }
    setRequesting(false)
  }

  return (
    <div className="max-w-5xl mx-auto p-6 text-white bg-slate-900 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-400">Mesa do Líder</h1>
        <Link href="/game/news/create" className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-semibold">
          Criar Jornal / Política
        </Link>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : unreadNews ? (
        <div className="bg-slate-800 p-8 rounded-lg shadow-lg border border-blue-900/50 mb-8 relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">NÃO LIDO</div>
          <h2 className="text-2xl font-bold mb-2">{unreadNews.newspapers.title}</h2>
          <p className="text-gray-400 italic mb-4">{unreadNews.newspapers.subtitle}</p>
          {unreadNews.newspapers.image_url && (
            <img src={unreadNews.newspapers.image_url} alt="Capa" className="w-full h-48 object-cover rounded mb-4" />
          )}
          <button 
            onClick={() => router.push(`/game/news/${unreadNews.id}`)}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold text-lg mt-4"
          >
            Ler Matéria e Tomar Decisão
          </button>
        </div>
      ) : (
        <div className="bg-slate-800 p-8 rounded-lg shadow-lg text-center mb-8">
          <p className="text-gray-400 mb-4">Sua mesa está vazia. Nenhum jornal novo nas últimas 24 horas.</p>
          <button 
            disabled={requesting}
            onClick={requestNewspaper}
            className="bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded font-semibold"
          >
            {requesting ? 'Buscando...' : 'Solicitar Jornal Diário'}
          </button>
        </div>
      )}

      <h3 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">Acontecimentos Nacionais (Histórico)</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {history.map(item => (
          <div key={item.id} className="bg-slate-800/50 p-4 rounded border border-slate-700 opacity-75">
            <h4 className="font-bold text-lg text-gray-300">{item.newspapers.title}</h4>
            <p className="text-sm text-gray-500">{item.newspapers.subtitle}</p>
          </div>
        ))}
        {history.length === 0 && <p className="text-gray-500">Nenhum jornal lido ainda.</p>}
      </div>
    </div>
  )
}