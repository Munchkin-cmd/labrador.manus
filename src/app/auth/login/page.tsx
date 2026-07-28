'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Email ou senha inválidos.')
      setLoading(false)
      return
    }

    // ✅ Aguarda o cookie ser gravado (500ms é seguro)
    await new Promise(resolve => setTimeout(resolve, 500))

    // ✅ Redireciona com router.push (NÃO use window.location.href)
    router.push('/game/home')
  }

  async function handleGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/game/home` },
    })
  }

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto w-full px-4 py-8">
      {/* Banner */}
      <div className="w-full bg-gradient-to-r from-green-800 via-green-600 to-green-800 
                      border-4 border-green-500/50 rounded-xl p-6 text-center shadow-[0_0_40px_rgba(34,197,94,0.3)]">
        <h2 className="text-5xl font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(0,255,0,0.5)]">
          labrador
        </h2>
        <p className="text-green-200/60 text-xs mt-1 font-mono">✦ ESTRATÉGIA GEOPOLÍTICA ✦</p>
      </div>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="btn-primary bg-white text-gray-900 hover:bg-gray-100 flex items-center justify-center gap-2"
      >
        <span>G</span> Entrar com Google
      </button>

      <div className="text-center text-white/40 text-sm">ou</div>

      <div className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="input-field"
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          className="input-field"
          disabled={loading}
        />
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <button onClick={handleLogin} disabled={loading} className="btn-primary">
        {loading ? 'Entrando...' : 'Entrar no Jogo'}
      </button>

      <p className="text-center text-white/50 text-sm">
        Não tem conta?{' '}
        <Link href="/auth/cadastro" className="text-green-400 font-semibold hover:text-green-300">
          Cadastrar
        </Link>
      </p>

      <p className="text-center text-white/30 text-xs italic leading-relaxed">
        "Eu prefiro viver uma vida curta e gloriosa do que uma longa porém na obscuridade"
        <br />— Alexandre, o Grande
      </p>
    </div>
  )
}