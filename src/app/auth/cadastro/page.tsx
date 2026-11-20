'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { 
  Eye, EyeOff, Loader2, Check, Globe, Shield, Users, 
  Coins, MapPin, BookOpen, Crown, TrendingUp, AlertTriangle
} from 'lucide-react'

// Importa o mapa dinamicamente
const DynamicMap = dynamic(() => import('@/components/DynamicMap'), { 
  ssr: false, 
  loading: () => <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">Carregando mapa...</div> 
})

// Dicionário simples para o mapa (GeoJSON usa inglês)
const TRANSLATIONS: Record<string, string> = {
  "Brasil": "Brazil",
  "Estados Unidos": "United States of America",
  "Rússia": "Russia",
  "China": "China",
  "Argentina": "Argentina",
  "Canadá": "Canada",
  "Reino Unido": "United Kingdom",
  "França": "France",
  "Alemanha": "Germany",
  "Japão": "Japan",
  "Itália": "Italy",
  "Espanha": "Spain",
  "Portugal": "Portugal",
  "México": "Mexico",
  "Índia": "India",
  "Austrália": "Australia",
}

type CountryData = {
  id: number
  name: string
  is_active: boolean
  flag_emoji: string
  terrain: string
  language: string
  religion: string
  state_structure: string
  users?: { flag_url: string | null } | { flag_url: string | null }[] | null
  economy?: { money: number; revenue: number } | null
  regions?: { population: number }[] | null // ✅ Adicionado regions para calcular a população
}

export default function CadastroPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null)
  const [leaderName, setLeaderName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [countries, setCountries] = useState<CountryData[]>([])
  const [loadingCountries, setLoadingCountries] = useState(true)

  useEffect(() => {
    async function fetchCountries() {
      // ✅ CORREÇÃO: Removido 'population' da economy e adicionado 'regions ( population )'
      const { data, error } = await supabase
        .from('countries')
        .select(`
          id, name, is_active, flag_emoji, terrain, language, religion, state_structure,
          economy ( money, revenue ),
          users ( flag_url ),
          regions ( population )
        `)
        .order('name', { ascending: true })

      if (error) {
        console.error("Erro ao buscar países:", error)
      } else if (data) {
        setCountries(data as any)
      }
      setLoadingCountries(false)
    }
    fetchCountries()
  }, [])

  async function handleRegister() {
    if (!selectedCountry) { setError('Selecione um país'); return }
    if (!leaderName.trim()) { setError('Digite seu nome de líder'); return }
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { country_id: selectedCountry.id, leader_name: leaderName },
      },
    })

    if (authError) {
      setError(authError.message || 'Erro ao criar conta.')
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/auth/login?cadastro=sucesso')
  }

  const getFlagDisplay = (country: CountryData) => {
    if (country.is_active && country.users) {
      const userData = Array.isArray(country.users) ? country.users[0] : country.users;
      if (userData?.flag_url) {
        return <img src={userData.flag_url} alt={country.name} className="w-full h-full object-cover" />
      }
    }
    return <span className="text-3xl">{country.flag_emoji || '🌐'}</span>
  }

  const formatNumber = (num?: number) => {
    if (!num) return '0'
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
    return num.toString()
  }

  // ✅ Calcula a população total do país selecionado (soma das regiões)
  const selectedCountryPop = selectedCountry?.regions?.reduce((acc, r) => acc + (r.population || 0), 0) || 0

  // Pega o nome em inglês para mandar pro mapa
  const mapFocusName = selectedCountry ? (TRANSLATIONS[selectedCountry.name] || selectedCountry.name) : null

  return (
    <div className="min-h-screen bg-[#0a0f18] flex flex-col pt-8 pb-8">
      
      {/* Header */}
      <div className="text-center mb-6 shrink-0">
        <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">labrador</h1>
        <p className="text-white/60 text-sm mt-1">Crie sua conta e escolha seu país</p>
        
        {/* Progresso */}
        <div className="flex gap-2 max-w-xs mx-auto w-full mt-4">
          <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-white/10'}`} />
          <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-white/10'}`} />
        </div>
      </div>

      {/* PASSO 1: CONTA */}
      {step === 1 && (
        <div className="w-full max-w-md mx-auto px-4 flex flex-col gap-4 bg-surface-card/80 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-surface-border shadow-2xl">
          <p className="text-white font-semibold text-sm uppercase tracking-widest flex items-center gap-2 mb-2">
            <span className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
            Sua Conta
          </p>
          
          <div>
            <label className="text-xs font-bold text-white/60 uppercase tracking-widest block mb-2">E-mail</label>
            <input 
              type="email" value={email} onChange={e => setEmail(e.target.value)} 
              placeholder="seu@email.com" 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-primary/50 transition-colors" 
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-white/60 uppercase tracking-widest block mb-2">Senha</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} 
                placeholder="Mínimo 6 caracteres" 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white focus:outline-none focus:border-primary/50 transition-colors" 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm font-semibold bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">{error}</p>}
          
          <button 
            onClick={() => {
              if (!email || password.length < 6) { setError('Preencha todos os campos corretamente.'); return }
              setError(''); setStep(2)
            }} 
            className="mt-2 w-full bg-primary hover:bg-primary-light text-white font-black py-3.5 rounded-xl uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
          >
            Próximo Passo
          </button>
        </div>
      )}

      {/* PASSO 2: ESCOLHA DO PAÍS E MAPA */}
      {step === 2 && (
        <div className="w-full max-w-7xl mx-auto px-4 flex flex-col lg:flex-row gap-6 h-[75vh] min-h-[600px] animate-in fade-in slide-in-from-right-4 duration-300">
          
          {/* LADO ESQUERDO: Lista de Cards */}
          <div className="w-full lg:w-4/12 bg-surface-card border border-surface-border rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-surface-border bg-black/20 shrink-0">
              <p className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                <Globe size={16} className="text-primary" /> Territórios
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar bg-[#0A0F1C]">
              {loadingCountries ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-primary" size={28} /></div>
              ) : countries.length === 0 ? (
                <div className="text-center text-white/40 py-10 font-mono text-xs uppercase">
                  Nenhum país encontrado.
                </div>
              ) : (
                countries.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCountry(c)} 
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
                      selectedCountry?.id === c.id
                        ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                        : c.is_active 
                          ? 'bg-surface-input border-surface-border opacity-60 hover:opacity-100 hover:border-red-500/50'
                          : 'bg-surface-input border-surface-border hover:border-primary/50 hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0 flex items-center justify-center bg-black/50 group-hover:scale-105 transition-transform ${selectedCountry?.id === c.id ? 'border-primary' : ''}`}>
                      {getFlagDisplay(c)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{c.name}</p>
                      <p className={`text-[10px] font-mono uppercase tracking-wider ${c.is_active ? 'text-red-400' : 'text-green-400'}`}>
                        {c.is_active ? 'Ocupado' : 'Disponível'}
                      </p>
                    </div>
                    {selectedCountry?.id === c.id && <Check size={18} className="text-primary shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* LADO DIREITO: Mapa e Detalhes */}
          <div className="w-full lg:w-8/12 flex flex-col gap-4 h-full">
            
            {/* Mapa */}
            <div className="w-full h-64 shrink-0 bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-2xl relative z-0">
               <DynamicMap focusCountryName={mapFocusName} />
            </div>

            {/* Informações e Confirmação */}
            <div className="flex-1 bg-surface-card border border-surface-border rounded-2xl p-6 flex flex-col shadow-2xl overflow-y-auto custom-scrollbar relative">
              {selectedCountry ? (
                <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
                  
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-surface-border">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-surface-border shadow-lg shrink-0 flex items-center justify-center bg-black/50">
                      {getFlagDisplay(selectedCountry)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-wider">{selectedCountry.name}</h2>
                      <p className="text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                        <Crown size={12} /> {selectedCountry.state_structure || 'Desconhecido'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {/* ✅ Passando a população calculada via regions */}
                    <StatBox icon={<Users size={14}/>} label="População" value={formatNumber(selectedCountryPop)} />
                    <StatBox icon={<Coins size={14}/>} label="Tesouro" value={formatNumber(selectedCountry.economy?.money)} />
                    <StatBox icon={<TrendingUp size={14}/>} label="Receita" value={formatNumber(selectedCountry.economy?.revenue)} />
                    <StatBox icon={<MapPin size={14}/>} label="Terreno" value={selectedCountry.terrain || 'N/A'} />
                    <StatBox icon={<Globe size={14}/>} label="Idioma" value={selectedCountry.language || 'N/A'} />
                    <StatBox icon={<BookOpen size={14}/>} label="Religião" value={selectedCountry.religion || 'N/A'} />
                    <StatBox icon={<Shield size={14}/>} label="Estrutura" value={selectedCountry.state_structure || 'N/A'} />
                  </div>

                  {/* Lógica de disponibilidade e confirmação */}
                  {selectedCountry.is_active ? (
                    <div className="mt-auto bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center justify-center gap-3">
                      <AlertTriangle className="text-red-400" size={24} />
                      <div>
                        <p className="text-red-400 font-bold text-sm uppercase">Território Ocupado</p>
                        <p className="text-white/60 text-xs">Este país já possui um jogador ativo. Escolha outro.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto bg-black/30 p-5 rounded-xl border border-surface-border">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-widest block mb-2">Nome do Líder</label>
                      <input 
                        type="text" value={leaderName} onChange={(e) => setLeaderName(e.target.value)}
                        placeholder="Ex: Napoleon Bonaparte"
                        className="w-full bg-surface-input border border-surface-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary mb-4 transition-colors"
                      />
                      
                      {error && <p className="text-red-400 text-sm font-semibold bg-red-500/10 p-2 rounded-lg mb-3 text-center">{error}</p>}
                      
                      <div className="flex gap-3">
                        <button onClick={() => setStep(1)} className="px-4 py-3 bg-surface-input hover:bg-white/5 border border-surface-border text-white font-bold rounded-xl transition-colors">
                          Voltar
                        </button>
                        <button 
                          onClick={handleRegister} disabled={!leaderName.trim() || loading}
                          className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-black py-3 rounded-xl uppercase tracking-widest shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all flex items-center justify-center gap-2"
                        >
                          {loading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                          {loading ? 'Fundando...' : 'Confirmar Escolha'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                  <Globe size={64} className="text-white/20 mb-4" />
                  <p className="text-white/60 text-sm font-mono uppercase tracking-widest">Selecione um país à esquerda</p>
                  <button onClick={() => setStep(1)} className="mt-6 text-white/50 hover:text-white underline text-sm">Voltar para a conta</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-white/80 text-sm mt-4">
        Já tem conta?{' '}
        <Link href="/auth/login" className="text-primary-light font-bold hover:text-white transition-colors">
          Entrar
        </Link>
      </p>
    </div>
  )
}

function StatBox({ icon, label, value }: { icon: any, label: string, value: string | number | undefined }) {
  return (
    <div className="bg-surface-input border border-surface-border rounded-lg p-2.5 flex flex-col gap-0.5">
      <span className="text-white/40 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5">
        {icon} {label}
      </span>
      <span className="text-white font-bold text-xs font-mono truncate capitalize">{value || '---'}</span>
    </div>
  )
}