'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

type Country = {
  id: number
  name: string
  is_active: boolean
}

export default function CadastroPage() {
  const router = useRouter()
  const [step, setStep]           = useState<1 | 2>(1)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [countryId, setCountryId] = useState<number | null>(null)
  const [leaderName, setLeaderName] = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  // ✅ Novos estados para buscar os países do banco
  const [countries, setCountries] = useState<Country[]>([])
  const [loadingCountries, setLoadingCountries] = useState(true)

  // ✅ Busca os países reais assim que a página carrega
  useEffect(() => {
    async function fetchCountries() {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name, is_active')
        .order('name', { ascending: true }) // Ordem alfabética

      if (!error && data) {
        setCountries(data as Country[])
      }
      setLoadingCountries(false)
    }
    fetchCountries()
  }, [])

  async function checkCountryAvailable(id: number): Promise<boolean> {
    const { data } = await supabase
      .from('countries')
      .select('is_active')
      .eq('id', id)
      .single()
    return data ? !data.is_active : false
  }

  async function handleRegister() {
    if (!countryId) { setError('Selecione um país'); return }
    if (!leaderName.trim()) { setError('Digite seu nome de líder'); return }
    setLoading(true)
    setError('')

    const available = await checkCountryAvailable(countryId)
    if (!available) {
      setError('Este país já está ocupado. Escolha outro.')
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { country_id: countryId, leader_name: leaderName },
      },
    })

    if (authError) {
      setError(authError.message || 'Erro ao criar conta. Verifique os dados ou tente outro país.')
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/auth/login?cadastro=sucesso')
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-black text-white text-center tracking-tight drop-shadow-md">labrador</h1>
      <p className="text-center text-white/80 text-sm">Crie sua conta e escolha seu país</p>

      {/* Progress */}
      <div className="flex gap-2">
        <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-white/10'}`} />
        <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-white/10'}`} />
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-white font-semibold text-sm">Passo 1 — Sua conta</p>
          
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="input-field" 
          />
          
          <div className="relative">
            <input 
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha (mín. 6 car)" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="input-field w-full pr-12" 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-1"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm font-semibold bg-red-500/10 p-2 rounded-lg">{error}</p>}
          
          <button 
            onClick={() => {
              if (!email || password.length < 6) { setError('Preencha todos os campos corretamente.'); return }
              setError(''); setStep(2)
            }} 
            className="btn-primary mt-2"
          >
            Próximo
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <p className="text-white font-semibold text-sm">Passo 2 — Seu país</p>

          <input
            placeholder="Seu nome (Líder)"
            value={leaderName}
            onChange={e => setLeaderName(e.target.value)}
            className="input-field"
          />

          {/* ✅ LISTA CUSTOMIZADA DE PAÍSES */}
          <div className="flex flex-col gap-2">
            <label className="text-white/60 text-xs font-bold font-mono uppercase tracking-widest pl-1">
              Selecione um território
            </label>
            
            {loadingCountries ? (
              <div className="flex items-center justify-center py-8 bg-surface-input rounded-xl border border-surface-border">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-surface-border rounded-xl bg-[#0A0F1C] flex flex-col p-2 gap-1.5 custom-scrollbar">
                {countries.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={c.is_active}
                    onClick={() => setCountryId(c.id)}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-all border flex justify-between items-center ${
                      c.is_active
                        ? 'bg-red-500/5 border-red-500/10 text-red-400/50 cursor-not-allowed'
                        : countryId === c.id
                          ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-[1.02]'
                          : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className={`text-[9px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-md ${
                      c.is_active 
                        ? 'bg-red-500/20 text-red-400' 
                        : countryId === c.id
                          ? 'bg-white/20 text-white'
                          : 'bg-green-500/20 text-green-400'
                    }`}>
                      {c.is_active ? 'Ocupado' : 'Livre'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-sm font-semibold bg-red-500/10 p-2 rounded-lg">{error}</p>}

          <button onClick={handleRegister} disabled={loading || !countryId} className="btn-primary mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Criando...' : 'Criar Meu País'}
          </button>
          
          <button onClick={() => setStep(1)} className="text-white/70 hover:text-white text-sm text-center transition-colors">
            ← Voltar
          </button>
        </div>
      )}

      <p className="text-center text-white/80 text-sm mt-2">
        Já tem conta?{' '}
        <Link href="/auth/login" className="text-primary-light font-bold hover:text-white transition-colors">
          Entrar
        </Link>
      </p>
    </div>
  )
}