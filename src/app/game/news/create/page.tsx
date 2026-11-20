'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'

// --- TIPAGENS TEMPORÁRIAS (Até você atualizar o database.ts) ---
type NewspaperInsert = {
  author_country_id: number
  title: string
  subtitle: string
  content: string
  image_url: string | null
  option_1_text: string
  option_1_effects: Record<string, number | string>
  option_2_text: string
  option_2_effects: Record<string, number | string>
  option_3_text: string
  option_3_effects: Record<string, number | string>
}

type PolicyInsert = {
  author_country_id: number
  title: string
  description: string
  image_url: string | null
  effects: Record<string, number | string>
}

export default function CreateNewsPage() {
  const router = useRouter()
  const { country } = useAuthStore()
  
  const [activeTab, setActiveTab] = useState<'newspaper' | 'policy'>('newspaper')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Estados do Jornal
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  
  // Opções do Jornal (Texto + Efeitos simples para o criador)
  const [options, setOptions] = useState([
    { text: '', moneyChange: 0, approvalChange: 0 },
    { text: '', moneyChange: 0, approvalChange: 0 },
    { text: '', moneyChange: 0, approvalChange: 0 },
  ])

  // Estados da Política
  const [policyTitle, setPolicyTitle] = useState('')
  const [policyDescription, setPolicyDescription] = useState('')
  const [policyImageUrl, setPolicyImageUrl] = useState('')
  const [policyMoneyEffect, setPolicyMoneyEffect] = useState(0)
  const [policyApprovalEffect, setPolicyApprovalEffect] = useState(0)

  const handleOptionChange = (index: number, field: string, value: string | number) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setOptions(newOptions)
  }

  async function handleSubmitNewspaper(e: React.FormEvent) {
    e.preventDefault()
    if (!country?.id) return setMessage({ type: 'error', text: 'País não encontrado.' })
    setLoading(true)
    setMessage(null)

    // Monta o JSON de efeitos que a RPC vai ler depois
    const payload: NewspaperInsert = {
      author_country_id: country.id,
      title,
      subtitle,
      content,
      image_url: imageUrl || null,
      option_1_text: options[0].text,
      option_1_effects: { money: options[0].moneyChange, approval: options[0].approvalChange },
      option_2_text: options[1].text,
      option_2_effects: { money: options[1].moneyChange, approval: options[1].approvalChange },
      option_3_text: options[2].text,
      option_3_effects: { money: options[2].moneyChange, approval: options[2].approvalChange },
    }

    const { error } = await supabase.from('newspapers').insert(payload)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Jornal enviado para aprovação com sucesso!' })
      // Limpar formulário
      setTitle(''); setSubtitle(''); setContent(''); setImageUrl('');
      setOptions([{ text: '', moneyChange: 0, approvalChange: 0 }, { text: '', moneyChange: 0, approvalChange: 0 }, { text: '', moneyChange: 0, approvalChange: 0 }])
    }
    setLoading(false)
  }

  async function handleSubmitPolicy(e: React.FormEvent) {
    e.preventDefault()
    if (!country?.id) return setMessage({ type: 'error', text: 'País não encontrado.' })
    setLoading(true)
    setMessage(null)

    const payload: PolicyInsert = {
      author_country_id: country.id,
      title: policyTitle,
      description: policyDescription,
      image_url: policyImageUrl || null,
      effects: { money: policyMoneyEffect, approval: policyApprovalEffect }
    }

    const { error } = await supabase.from('policies').insert(payload)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Política enviada para aprovação com sucesso!' })
      setPolicyTitle(''); setPolicyDescription(''); setPolicyImageUrl(''); setPolicyMoneyEffect(0); setPolicyApprovalEffect(0)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 text-white bg-slate-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-400">Redação Nacional</h1>
        <button onClick={() => router.push('/game/news')} className="text-sm text-gray-400 hover:text-white">
          Voltar para a Mesa
        </button>
      </div>

      {/* ABAS */}
      <div className="flex space-x-4 mb-6 border-b border-slate-700">
        <button
          onClick={() => { setActiveTab('newspaper'); setMessage(null) }}
          className={`py-2 px-4 font-semibold ${activeTab === 'newspaper' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
        >
          Criar Jornal (Evento)
        </button>
        <button
          onClick={() => { setActiveTab('policy'); setMessage(null) }}
          className={`py-2 px-4 font-semibold ${activeTab === 'policy' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
        >
          Criar Política Nacional
        </button>
      </div>

      {message && (
        <div className={`p-4 mb-6 rounded ${message.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
          {message.text}
        </div>
      )}

      {/* FORMULÁRIO DE JORNAL */}
      {activeTab === 'newspaper' && (
        <form onSubmit={handleSubmitNewspaper} className="space-y-4 bg-slate-800 p-6 rounded-lg shadow">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Título</label>
              <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 bg-slate-700 rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Subtítulo</label>
              <input required type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} className="w-full p-2 bg-slate-700 rounded" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm mb-1">URL da Foto</label>
            <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full p-2 bg-slate-700 rounded" placeholder="https://..." />
          </div>

          <div>
            <label className="block text-sm mb-1">Matéria (Descrição)</label>
            <textarea required rows={4} value={content} onChange={e => setContent(e.target.value)} className="w-full p-2 bg-slate-700 rounded" />
          </div>

          <h3 className="text-lg font-bold mt-6 mb-2 border-t border-slate-700 pt-4">As 3 Opções e seus Efeitos (Ocultos para o jogador)</h3>
          <div className="grid gap-4">
            {options.map((opt, i) => (
              <div key={i} className="p-4 bg-slate-700/50 rounded border border-slate-600 space-y-2">
                <label className="block text-sm font-semibold text-blue-300">Opção {i + 1}</label>
                <input required type="text" placeholder="Texto do botão (Ex: Aprovar lei)" value={opt.text} onChange={e => handleOptionChange(i, 'text', e.target.value)} className="w-full p-2 bg-slate-800 rounded" />
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400">Mudança no Dinheiro (Ex: 500 ou -500)</label>
                    <input required type="number" value={opt.moneyChange} onChange={e => handleOptionChange(i, 'moneyChange', Number(e.target.value))} className="w-full p-2 bg-slate-800 rounded" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400">Mudança na Aprovação (Ex: 10 ou -5)</label>
                    <input required type="number" value={opt.approvalChange} onChange={e => handleOptionChange(i, 'approvalChange', Number(e.target.value))} className="w-full p-2 bg-slate-800 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded mt-4">
            {loading ? 'Enviando...' : 'Enviar Jornal para Aprovação'}
          </button>
        </form>
      )}

      {/* FORMULÁRIO DE POLÍTICA */}
      {activeTab === 'policy' && (
        <form onSubmit={handleSubmitPolicy} className="space-y-4 bg-slate-800 p-6 rounded-lg shadow">
          <div>
            <label className="block text-sm mb-1">Título da Política</label>
            <input required type="text" value={policyTitle} onChange={e => setPolicyTitle(e.target.value)} className="w-full p-2 bg-slate-700 rounded" />
          </div>
          
          <div>
            <label className="block text-sm mb-1">URL da Foto</label>
            <input type="url" value={policyImageUrl} onChange={e => setPolicyImageUrl(e.target.value)} className="w-full p-2 bg-slate-700 rounded" placeholder="https://..." />
          </div>

          <div>
            <label className="block text-sm mb-1">Descrição da Política</label>
            <textarea required rows={4} value={policyDescription} onChange={e => setPolicyDescription(e.target.value)} className="w-full p-2 bg-slate-700 rounded" />
          </div>

          <h3 className="text-lg font-bold mt-6 mb-2 border-t border-slate-700 pt-4">Efeitos Globais (Enquanto estiver ativa)</h3>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="text-sm text-gray-400">Bônus/Penalidade de Dinheiro</label>
              <input required type="number" value={policyMoneyEffect} onChange={e => setPolicyMoneyEffect(Number(e.target.value))} className="w-full p-2 bg-slate-700 rounded" />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-400">Bônus/Penalidade de Aprovação</label>
              <input required type="number" value={policyApprovalEffect} onChange={e => setPolicyApprovalEffect(Number(e.target.value))} className="w-full p-2 bg-slate-700 rounded" />
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded mt-4">
            {loading ? 'Enviando...' : 'Enviar Política para Aprovação'}
          </button>
        </form>
      )}
    </div>
  )
}