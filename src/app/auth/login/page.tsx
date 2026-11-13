'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Eye, EyeOff, User, Lock, LogIn, Globe } from 'lucide-react'

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

    // ✅ Lógica mantida: se não tiver '@', ele adiciona o domínio interno
    const emailToSubmit = identifier.includes('@') ? identifier : `${identifier}@labrador.com`

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: emailToSubmit,
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
    <div className="flex flex-col gap-6 w-full animate-in fade-in zoom-in-95 duration-500">
      
      {/* Cabeçalho Visual */}
      <div className="text-center mb-2">
        <div className="w-16 h-16 bg-primary/20 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
          <Globe className="text-primary" size={32} />
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-md">
          labrador
        </h1>
        <p className="text-white/50 text-sm mt-1 font-mono uppercase tracking-wider">
          Acesse o comando da sua nação
        </p>
      </div>

      {/* Card de Login (Glassmorphism) */}
      <div className="bg-surface-card/80 backdrop-blur-xl border border-surface-border p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col gap-5">
        
        {/* Input de Usuário */}
        <div>
          <label className="text-xs font-bold text-white/60 uppercase tracking-widest block mb-2">Usuário</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              placeholder="Ex: napoleon"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              disabled={loading}
            />
          </div>
        </div>
        
        {/* Input de Senha */}
        <div>
          <label className="text-xs font-bold text-white/60 uppercase tracking-widest block mb-2">Senha</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-12 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <p className="text-red-400 text-sm text-center font-semibold bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
            {error}
          </p>
        )}

        {/* Botão de Entrar */}
        <button 
          onClick={handleLogin} 
          disabled={loading || !identifier || !password} 
          className="mt-2 w-full bg-primary hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
        >
          {loading ? 'Autenticando...' : (
            <>
              Entrar <LogIn size={20} />
            </>
          )}
        </button>

        {/* Link de Cadastro */}
        <div className="mt-4 text-center border-t border-white/10 pt-4">
          <p className="text-white/50 text-sm">Ainda não tem uma nação?</p>
          <Link href="/auth/cadastro" className="text-primary hover:text-primary-light font-bold text-sm flex items-center justify-center gap-1 mt-1 transition-colors">
            Criar Império
          </Link>
        </div>
      </div>

      {/* ✅ Citação Histórica: Agora em branco e negrito */}
      <div className="text-center mt-4 max-w-xs mx-auto">
        <p className="text-white font-bold text-xs italic leading-relaxed drop-shadow-md">
          "Eu prefiro viver uma vida curta e gloriosa do que uma longa porém na obscuridade"
        </p>
        <p className="text-white font-black text-[10px] uppercase tracking-widest mt-2">
          — Alexandre, o Grande
        </p>
      </div>

    </div>
  )
}