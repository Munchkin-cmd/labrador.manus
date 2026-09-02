'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="flex flex-col gap-6 max-w-md mx-auto w-full px-4 py-8">
      
      {/* Banner com a nota de dólar e texto "labrador" sobreposto */}
      <div className="w-full border-4 border-green-500/50 rounded-xl shadow-[0_0_40px_rgba(34,197,94,0.3)] h-40 overflow-hidden relative bg-black">
        {/* Imagem de fundo */}
        <img
          src="https://conteudo.imguol.com.br/c/noticias/05/2022/01/14/notas-dolar-eua-1642179172721_v2_450x600.jpg"
          alt="Nota de dólar"
          className="absolute inset-0 w-full h-full object-cover object-top"
          style={{ transform: 'scale(1.2)', transformOrigin: 'center top' }}
        />
        
        {/* Texto "labrador" sobreposto */}
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