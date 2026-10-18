'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react' // ✅ Importando os ícones de olho

// 82 países com ID fixo — igual ao banco
const PAISES = [
  {id:1,nome:'Africa Austral'},{id:2,nome:'Africa Central Ocidental'},
  {id:3,nome:'Alemanha'},{id:4,nome:'America Central'},{id:5,nome:'Andino'},
  {id:6,nome:'Angola'},{id:7,nome:'Argelia'},{id:8,nome:'Asia Turcomena'},
  {id:9,nome:'Austria'},{id:10,nome:'Balcas Ocidentais'},{id:11,nome:'Balticos'},
  {id:12,nome:'Benelux'},{id:13,nome:'Bielorrussia'},{id:14,nome:'Brasil'},
  {id:15,nome:'Bulgaria'},{id:16,nome:'Canada'},{id:17,nome:'Caribe'},
  {id:18,nome:'Caucaso'},{id:19,nome:'Chifre da Africa'},{id:20,nome:'Chile'},
  {id:21,nome:'China'},{id:22,nome:'Colômbia'},{id:23,nome:'Comunidade Australiana'},
  {id:24,nome:'Coreia'},{id:25,nome:'Costa do Ouro'},{id:26,nome:'Costa Ocidental'},
  {id:27,nome:'Eritreia'},{id:28,nome:'Espanha'},{id:29,nome:'Estados Unidos'},
  {id:30,nome:'Filipinas'},{id:31,nome:'Finlandia'},{id:32,nome:'Franca'},
  {id:33,nome:'Golfo da Guine'},{id:34,nome:'Grande Lagos'},{id:35,nome:'Grande Paquistao'},
  {id:36,nome:'Grecia'},{id:37,nome:'Guianas'},{id:38,nome:'Himalaia'},
  {id:39,nome:'Hungria'},{id:40,nome:'Iliria'},{id:41,nome:'Imperio Dinarmaques'},
  {id:42,nome:'India'},{id:43,nome:'Indico Insular'},{id:44,nome:'Indochina'},
  {id:45,nome:'Insulindia'},{id:46,nome:'Ira'},{id:47,nome:'Iraque'},
  {id:48,nome:'Irlanda'},{id:49,nome:'Israel'},{id:50,nome:'Italia'},
  {id:51,nome:'Japao'},{id:52,nome:'Jordania'},{id:53,nome:'Levante'},
  {id:54,nome:'Magrebe Oriental'},{id:55,nome:'Malaio'},{id:56,nome:'Marrocos'},
  {id:57,nome:'Mauritânia'},{id:58,nome:'Mercosul'},{id:59,nome:'Mexico'},
  {id:60,nome:'Moçambique-Malawi'},{id:61,nome:'Mongolia'},{id:62,nome:'Myanmar'},
  {id:63,nome:'Noruega'},{id:64,nome:'Nova Zelandia'},{id:65,nome:'Peninsula Arabica'},
  {id:66,nome:'Polonia'},{id:67,nome:'Portugal'},{id:68,nome:'RD Congo'},
  {id:69,nome:'Reino Unido da Gra Bretanha'},{id:70,nome:'Rodesia'},
  {id:71,nome:'Romenia'},{id:72,nome:'Russia'},{id:73,nome:'Sahel'},
  {id:74,nome:'Servia'},{id:75,nome:'Suecia'},{id:76,nome:'Suica'},
  {id:77,nome:'Tailandia'},{id:78,nome:'Tchecoslovaquia'},{id:79,nome:'Turquia-Azerbaijao'},
  {id:80,nome:'Ucrania'},{id:81,nome:'Vale do Nilo'},{id:82,nome:'Venezuela'},
]

export default function CadastroPage() {
  const router = useRouter()
  const [step, setStep]           = useState<1 | 2>(1)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPassword, setShowPassword] = useState(false) // ✅ Estado para mostrar/ocultar
  const [countryId, setCountryId] = useState<number | null>(null)
  const [leaderName, setLeaderName] = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

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
      {/* ✅ Texto em branco */}
      <p className="text-center text-white/80 text-sm">Crie sua conta e escolha seu país</p>

      {/* Progress */}
      <div className="flex gap-2">
        <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-white/10'}`} />
        <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-white/10'}`} />
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          {/* ✅ Texto em branco */}
          <p className="text-white font-semibold text-sm">Passo 1 — Sua conta</p>
          
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="input-field" 
          />
          
          {/* ✅ CAMPO DE SENHA COM O OLHINHO */}
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
          {/* ✅ Texto em branco */}
          <p className="text-white font-semibold text-sm">Passo 2 — Seu país</p>

          <input
            placeholder="Seu nome (Líder)"
            value={leaderName}
            onChange={e => setLeaderName(e.target.value)}
            className="input-field"
          />

          <select
            value={countryId ?? ''}
            onChange={e => setCountryId(Number(e.target.value))}
            className="input-field"
          >
            <option value="">Selecionar país</option>
            {PAISES.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>

          {error && <p className="text-red-400 text-sm font-semibold bg-red-500/10 p-2 rounded-lg">{error}</p>}

          <button onClick={handleRegister} disabled={loading} className="btn-primary mt-2">
            {loading ? 'Criando...' : 'Criar Meu País'}
          </button>
          
          {/* ✅ Texto do botão voltar mais visível */}
          <button onClick={() => setStep(1)} className="text-white/70 hover:text-white text-sm text-center transition-colors">
            ← Voltar
          </button>
        </div>
      )}

      {/* ✅ Texto em branco */}
      <p className="text-center text-white/80 text-sm mt-2">
        Já tem conta?{' '}
        <Link href="/auth/login" className="text-primary-light font-bold hover:text-white transition-colors">
          Entrar
        </Link>
      </p>
    </div>
  )
}