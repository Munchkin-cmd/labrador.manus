'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import { Landmark, Users, Scale, ShieldAlert, CheckCircle2, XCircle, FileText } from 'lucide-react'

export default function ParliamentPage() {
  const { country } = useAuthStore()
  const [parliament, setParliament] = useState<any>(null)
  const [countryData, setCountryData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!country?.id) return
      
      const [parlRes, countryRes] = await Promise.all([
        supabase.from('parliament').select('*').eq('country_id', country.id).maybeSingle(),
        supabase.from('countries').select('systems, state_structure').eq('id', country.id).single()
      ])

      setParliament(parlRes.data)
      setCountryData(countryRes.data)
      setLoading(false)
    }
    fetchData()
  }, [country?.id])

  if (loading) return <div className="flex h-full items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>

  const coalition = parliament?.coalition_seats || 0
  const opposition = parliament?.opposition_seats || 0
  const total = parliament?.total_seats || 100
  const coalitionPct = Math.round((coalition / total) * 100)

  return (
    // ✅ CORREÇÃO: pt-6 alterado para pt-20
    <div className="flex flex-col gap-6 pb-24 pt-20 max-w-4xl mx-auto w-full px-4">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Landmark className="text-primary" /> Parlamento Nacional
        </h1>
        <p className="text-white/50 text-sm mt-1">Gerencie as leis e o equilíbrio de poder do seu país.</p>
      </div>

      {/* Sistema de Governo */}
      <div className={`border p-4 rounded-xl flex items-center justify-between ${
        countryData?.systems === 'Democracia' 
          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
          : 'bg-red-500/10 border-red-500/30 text-red-400'
      }`}>
        <div className="flex items-center gap-3">
          {countryData?.systems === 'Democracia' ? <Scale size={24} /> : <ShieldAlert size={24} />}
          <div>
            <p className="font-bold text-sm uppercase tracking-widest">Sistema: {countryData?.systems || 'Desconhecido'}</p>
            <p className="text-xs opacity-80 mt-0.5">Estrutura: {countryData?.state_structure}</p>
          </div>
        </div>
      </div>

      {/* Assentos */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 shadow-lg">
        <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Users size={16} /> Composição da Casa
        </h2>
        
        <div className="flex justify-between text-sm font-mono font-bold mb-2">
          <span className="text-green-400">Coalizão: {coalition}</span>
          <span className="text-red-400">Oposição: {opposition}</span>
        </div>
        
        {/* Barra de Progresso */}
        <div className="w-full h-4 bg-black/50 rounded-full overflow-hidden flex border border-white/10 shadow-inner">
          <div style={{ width: `${coalitionPct}%` }} className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
          <div style={{ width: `${100 - coalitionPct}%` }} className="h-full bg-red-500" />
        </div>
        
        <div className="mt-4 flex justify-between text-[10px] text-white/40 font-mono">
          <span>Última eleição: {parliament?.last_election_at ? new Date(parliament.last_election_at).toLocaleDateString() : 'Nenhuma'}</span>
          <span>Tipo: {parliament?.election_type || 'Normal'}</span>
        </div>
      </div>

      {/* Projetos de Lei */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest flex items-center gap-2">
            <FileText size={16} /> Projetos de Lei
          </h2>
          <button className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded transition-colors">
            + Propor Lei
          </button>
        </div>
        
        <div className="text-center py-8 border border-white/5 bg-black/20 rounded-lg">
          <p className="text-white/40 text-sm">Nenhuma lei em votação no momento.</p>
        </div>
      </div>
    </div>
  )
}