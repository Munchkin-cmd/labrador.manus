'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: identifier.includes('@') ? identifier : `${identifier}@labrador.com`,
      password,
    })

    if (authError) {
      setError('Usuário ou senha inválidos.')
      setLoading(false)
      return
    }

    await new Promise(resolve => setTimeout(resolve, 500))
    router.push('/game/home')
  }

  return (
    // ✅ Removido max-w-md mx-auto px-4 py-8, pois o AuthLayout já faz isso
    <div className="flex flex-col gap-6 w-full">
      
      {/* Banner com a nota de dólar e texto "labrador" sobreposto */}
      <div className="w-full border-4 border-emerald-500/50 rounded-xl shadow-[0_0_40px_rgba(16,185,129,0.3)] h-40 overflow-hidden relative bg-black">
        <img
          src="https://conteudo.imguol.com.br/c/noticias/05/2022/01/14/notas-dolar-eua-1642179172721_v2_450x600.jpg"
          alt="Nota de dólar"
          className="absolute inset-0 w-full h-full object-cover object-top"
          style={{ transform: 'scale(1.2)', transformOrigin: 'center top' }}
        />
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <h2 className="text-4xl font-black text-white tracking-widest drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            labrador
          </h2>
        </div>
      </div>

      {/* Login com usuário e senha */}
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Usuário"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          className="input-field"
          disabled={loading}
        />
        
        {/* ✅ CAMPO DE SENHA COM O OLHINHO */}
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="input-field w-full pr-12"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-1"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm text-center font-semibold bg-red-500/10 p-2 rounded-lg">{error}</p>}

      <button onClick={handleLogin} disabled={loading} className="btn-primary">
        {loading ? 'Entrando...' : 'Entrar no Jogo'}
      </button>

      <p className="text-center text-white text-sm font-medium">
        Não tem conta?{' '}
        <Link href="/auth/cadastro" className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
          Cadastrar
        </Link>
      </p>

      <p className="text-center text-white/80 text-xs italic leading-relaxed mt-2">
        "Eu prefiro viver uma vida curta e gloriosa do que uma longa porém na obscuridade"
        <br />
        <span className="text-white font-semibold not-italic mt-1 inline-block">— Alexandre, o Grande</span>
      </p>
    </div>
  )
}