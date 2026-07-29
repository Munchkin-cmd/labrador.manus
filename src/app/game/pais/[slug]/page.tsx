// src/app/game/pais/[slug]/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useParliament } from '@/hooks/useParliament'
import { Database } from '@/lib/database' // ← caminho corrigido
import { 
  ArrowLeft, Coins, Shield, Handshake, Swords, Ban,
  Landmark, MapPin, Globe, Flag, Crown, Send, X, Building2,
  Package, Trophy, Skull
} from 'lucide-react'

// ─── TIPOS DO BANCO ──────────────────────────────────────────
type CountryRow = Database['public']['Tables']['countries']['Row']
type DiplomacyRow = Database['public']['Tables']['diplomacy']['Row']
type DiplomacyInsert = Database['public']['Tables']['diplomacy']['Insert']
type UserRow = Database['public']['Tables']['users']['Row']
type EconomyRow = Database['public']['Tables']['economy']['Row']

// ─── MENSAGENS DIPLOMÁTICAS PRÉ-DEFINIDAS ──────────────────
const DIPLOMATIC_MESSAGES = [
  { id: 'formal_positive', title: '🌟 Mensagem de Amizade', content: 'O governo do seu país envia suas mais sinceras saudações e deseja estabelecer laços de cooperação e prosperidade mútua.', effect_relation: 15, effect_approval: 5, effect_trust: 5 },
  { id: 'formal_negative', title: '📜 Nota de Repúdio', content: 'O governo do seu país expressa sua profunda preocupação com as recentes ações do seu governo, que consideramos uma ameaça à estabilidade regional.', effect_relation: -20, effect_approval: -5, effect_trust: -10 },
  { id: 'insult', title: '🤬 Insulto Grave', content: 'Vocês são um bando de incompetentes e a sua liderança é um lixo! Não passam de um país de terceira categoria!', effect_relation: -50, effect_approval: -20, effect_trust: -30 },
  { id: 'threat', title: '⚡ Ameaça de Guerra', content: 'Seu país está brincando com fogo. Se continuar com essa atitude, não hesitaremos em usar todos os meios necessários para proteger nossos interesses.', effect_relation: -40, effect_approval: -15, effect_trust: -20 },
]

// ─── TRATADOS ────────────────────────────────────────────────
const TREATIES = [
  { id: 'defensive', name: 'Tratado de Defesa Mútua', description: 'Defender o aliado em caso de ataque' },
  { id: 'trade', name: 'Tratado de Livre Comércio', description: 'Redução de impostos entre os países' },
  { id: 'non_aggression', name: 'Pacto de Não Agressão', description: 'Compromisso de não atacar' },
  { id: 'alliance', name: 'Aliança Estratégica', description: 'Cooperação militar e econômica' },
  { id: 'peace', name: 'Tratado de Paz', description: 'Fim das hostilidades' },
]

// ─── TIPO PARA O RETORNO DAS RPCS ───────────────────────────
type RpcResponse = {
  success: boolean
  message?: string
  error?: string
}

export default function PaisPage() {
  const params = useParams()
  const router = useRouter()
  const { user, country: myCountry } = useAuthStore()
  const slug = params.slug as string

  const [loading, setLoading] = useState(true)
  const [country, setCountry] = useState<CountryRow | null>(null)
  const [userProfile, setUserProfile] = useState<UserRow | null>(null)
  const [economy, setEconomy] = useState<EconomyRow | null>(null)
  const [relation, setRelation] = useState<DiplomacyRow | null>(null)
  const [regions, setRegions] = useState<any[]>([])
  const [buildingsCount, setBuildingsCount] = useState<Record<string, number>>({})
  const [selectedTreaty, setSelectedTreaty] = useState('')
  const [treatyMessage, setTreatyMessage] = useState('')
  const [showTreatyModal, setShowTreatyModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { proposeLaw } = useParliament()

  const isMyCountry = myCountry?.id === country?.id

  // ─── BUSCAR DADOS DO PAÍS E REGIÕES ──────────────────────
  useEffect(() => {
    async function fetchCountry() {
      setLoading(true)
      setError('')

      const { data: countryData, error: countryError } = await supabase
        .from('countries')
        .select('*')
        .eq('slug', slug)
        .maybeSingle<CountryRow>()

      if (countryError || !countryData) {
        setError('País não encontrado')
        setLoading(false)
        return
      }

      setCountry(countryData)

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('country_id', countryData.id)
        .maybeSingle<UserRow>()

      if (userData) setUserProfile(userData)

      const { data: econData } = await supabase
        .from('economy')
        .select('*')
        .eq('country_id', countryData.id)
        .maybeSingle<EconomyRow>()

      if (econData) setEconomy(econData)

      if (countryData.id) {
        const { data: regionsData, error: regionsError } = await supabase
          .from('regions')
          .select('id, name, used_area')
          .eq('country_id', countryData.id)

        if (!regionsError && regionsData && regionsData.length > 0) {
          setRegions(regionsData)
          
          const regionIds = regionsData.map((r: any) => r.id)
          if (regionIds.length > 0) {
            const { data: buildingsData } = await supabase
              .from('buildings')
              .select('region_id, quantity')
              .in('region_id', regionIds)

            if (buildingsData) {
              const count: Record<string, number> = {}
              buildingsData.forEach((b: any) => {
                count[b.region_id] = (count[b.region_id] || 0) + b.quantity
              })
              setBuildingsCount(count)
            }
          }
        }
      }

      if (user && myCountry?.id && countryData.id !== myCountry.id) {
        const { data: relData } = await supabase
          .from('diplomacy')
          .select('*')
          .or(`country_a_id.eq.${myCountry.id},country_b_id.eq.${myCountry.id}`)
          .or(`country_a_id.eq.${countryData.id},country_b_id.eq.${countryData.id}`)
          .maybeSingle<DiplomacyRow>()

        if (relData) {
          setRelation(relData)
        } else {
          const { data: newRel, error: insertError } = await supabase
            .from('diplomacy')
            .insert({
              country_a_id: myCountry.id,
              country_b_id: countryData.id,
              status: 'neutral',
              relation_score: 50,
              has_embassy: false,
              is_sanctioned: false
            })
            .select()
            .single<DiplomacyRow>()

          if (!insertError && newRel) {
            setRelation(newRel)
          }
        }
      }

      setLoading(false)
    }

    if (slug) {
      fetchCountry()
    }
  }, [slug, user, myCountry])

  // ─── UTILITÁRIO PARA UPSERT COM ON CONFLICT ──────────────
  async function upsertDiplomacy(data: any) {
    // Força a atualização usando onConflict na chave composta
    const { data: result, error } = await supabase
      .from('diplomacy')
      .upsert(data, { onConflict: 'country_a_id, country_b_id' })
      .select()
      .single()

    if (error) throw error
    return result
  }

  // ─── AÇÕES DIPLOMÁTICAS ────────────────────────────────────

  async function handleDiplomaticAction(action: 'ally' | 'neutral') {
    if (!user || !myCountry || !country) return
    if (isMyCountry) return

    setError('')
    setSuccess('')

    try {
      const result = await upsertDiplomacy({
        country_a_id: myCountry.id,
        country_b_id: country.id,
        status: action,
        relation_score: action === 'ally' ? 80 : 50,
        updated_at: new Date().toISOString(),
      })
      setRelation(result)
      const labels = { ally: 'Aliado', neutral: 'Neutro' }
      setSuccess(`✅ Relação alterada para ${labels[action]}`)
    } catch (err: any) {
      setError(err.message || 'Erro ao executar ação diplomática')
    }
    setTimeout(() => setSuccess(''), 4000)
  }

  async function handleDeclareWar() {
    if (!user || !myCountry || !country) return
    if (isMyCountry) return

    if (country.is_active === true) {
      setError('❌ Você só pode declarar guerra contra NPCs!')
      return
    }
    setError('')
    setSuccess('')

    const res = await proposeLaw(8, { countryId: country.id })

    if (res.success) {
      setSuccess('⚔️ Lei de Guerra enviada ao parlamento! Aguarde a votação.')
    } else {
      setError(res.error || 'Erro ao propor guerra')
    }
    setTimeout(() => setSuccess(''), 4000)
  }

  async function handleSanctions() {
    if (!user || !myCountry || !country) return
    if (isMyCountry) return

    const isCurrentlySanctioned = relation?.is_sanctioned === true

    setError('')
    setSuccess('')

    if (isCurrentlySanctioned) {
      try {
        const result = await upsertDiplomacy({
          country_a_id: myCountry.id,
          country_b_id: country.id,
          is_sanctioned: false,
          status: 'neutral',
          updated_at: new Date().toISOString(),
        })
        setRelation(result)
        setSuccess('✅ Sanções removidas')
      } catch (err: any) {
        setError(err.message || 'Erro ao remover sanções')
      }
    } else {
      const res = await proposeLaw(10, { countryId: country.id })
      if (res.success) {
        setSuccess('🚫 Lei de Sanções enviada ao parlamento! Aguarde a votação.')
      } else {
        setError(res.error || 'Erro ao propor sanções')
      }
    }

    setTimeout(() => setSuccess(''), 4000)
  }

  async function handleEmbassy() {
    if (!user || !myCountry || !country) return
    if (isMyCountry) return

    const hasEmbassy = relation?.has_embassy === true

    if (!hasEmbassy) {
      const { data: econ } = await supabase
        .from('economy')
        .select('money')
        .eq('country_id', myCountry.id)
        .single()

      if (!econ || econ.money < 100000000) {
        setError('❌ Dinheiro insuficiente para construir embaixada (R$ 100.000.000)')
        return
      }

      await supabase
        .from('economy')
        .update({ money: econ.money - 100000000 })
        .eq('country_id', myCountry.id)
    }

    try {
      const result = await upsertDiplomacy({
        country_a_id: myCountry.id,
        country_b_id: country.id,
        has_embassy: !hasEmbassy,
        updated_at: new Date().toISOString(),
      })
      setRelation(result)
      setSuccess(hasEmbassy ? '✅ Embaixada destruída' : '✅ Embaixada construída')
    } catch (err: any) {
      setError(err.message || 'Erro ao construir/destruir embaixada')
    }
    setTimeout(() => setSuccess(''), 4000)
  }

  async function handleSendMoney(amount: number) {
    if (!user || !myCountry || !country) return
    if (isMyCountry) return

    setError('')
    setSuccess('')

    try {
      const { data, error } = await supabase
        .rpc('transfer_money', {
          p_from: myCountry.id,
          p_to: country.id,
          p_amount: amount,
        }) as { data: RpcResponse | null; error: any }

      if (error || !data?.success) {
        setError(data?.error || error?.message || 'Erro ao transferir dinheiro')
        return
      }

      setSuccess(data?.message || '✅ Dinheiro enviado com sucesso!')
    } catch (err: any) {
      setError(err.message || 'Erro ao transferir dinheiro')
    }
    setTimeout(() => setSuccess(''), 4000)
  }

  async function handleSendMessage() {
    if (!selectedMessage) {
      setError('Selecione uma mensagem')
      return
    }
    if (!user || !myCountry || !country) return

    setError('')
    setSuccess('')

    const msg = DIPLOMATIC_MESSAGES.find(m => m.id === selectedMessage)

    try {
      const { error: rpcError } = await supabase
        .rpc('send_diplomatic_message', {
          p_from_country: myCountry.id,
          p_to_country: country.id,
          p_message_id: msg?.id || ''
        })

      if (rpcError) throw rpcError

      setSuccess(`✅ ${msg?.title} enviada com sucesso!`)
      setShowMessageModal(false)
      setSelectedMessage('')
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar mensagem')
    }
    setTimeout(() => setSuccess(''), 4000)
  }

  async function handleSendTreaty() {
    if (!selectedTreaty) {
      setError('Selecione um tratado')
      return
    }
    if (!user || !myCountry || !country) return

    setError('')
    setSuccess('')

    const treaty = TREATIES.find(t => t.id === selectedTreaty)

    try {
      const result = await upsertDiplomacy({
        country_a_id: myCountry.id,
        country_b_id: country.id,
        treaty_status: selectedTreaty,
        treaty_message: treatyMessage || `Proposta de ${treaty?.name}`,
        updated_at: new Date().toISOString(),
      })
      setRelation(result)
      setSuccess(`✅ ${treaty?.name} enviado com sucesso!`)
      setShowTreatyModal(false)
      setSelectedTreaty('')
      setTreatyMessage('')
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar tratado')
    }
    setTimeout(() => setSuccess(''), 4000)
  }

  // ─── LOADING ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error || !country) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-4xl font-bold text-white">404</h1>
        <p className="text-white/60">País não encontrado</p>
        <Link href="/game/home" className="btn-primary">
          Voltar ao início
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      <div className="flex items-center gap-4 mb-4 pt-4">
        <button
          onClick={() => router.back()}
          className="text-white/50 hover:text-white transition-colors p-2 -ml-2"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">Perfil do País</h1>
      </div>

      <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gradient-to-r from-primary/30 to-primary/5 border border-white/10">
        {userProfile?.banner_urls?.[0] ? (
          <img
            src={userProfile.banner_urls[0]}
            alt={country.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl text-white/10">
            🌍
          </div>
        )}
      </div>

      <div className="relative px-4">
        <div className="relative -mt-16 flex items-end gap-4">
          
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full border-4 border-primary shadow-lg shadow-primary/20 overflow-hidden bg-black/80">
              {userProfile?.flag_url ? (
                <img
                  src={userProfile.flag_url}
                  alt={country.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-white/30">
                  <Flag size={40} />
                </div>
              )}
            </div>
          </div>

          <div className="relative flex-shrink-0 -ml-4">
            <div className="w-20 h-20 rounded-full border-4 border-white/20 shadow-lg overflow-hidden bg-black/80">
              {userProfile?.leader_url ? (
                <img
                  src={userProfile.leader_url}
                  alt={country.leader_name || 'Líder'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-white/30">
                  <Crown size={36} />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 text-center pb-4">
            <h2 className="text-2xl font-bold text-white">{country.name}</h2>
            {!country.is_active && (
              <span className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full mt-1 inline-block">NPC</span>
            )}
          </div>
          
        </div>
      </div>

      {user && !isMyCountry && (
        <div className="mt-2 px-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => handleDiplomaticAction('ally')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1
              ${relation?.status === 'ally' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-transparent'}`}
          >
            <Handshake size={14} />
            Aliança
          </button>
          <button
            onClick={() => setShowTreatyModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/20 text-primary-light hover:bg-primary/30 transition-colors border border-primary/20 flex items-center gap-1"
          >
            <Send size={14} />
            Tratado
          </button>
          <button
            onClick={handleSanctions}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1
              ${relation?.is_sanctioned 
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' 
                : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/10'}`}
          >
            <Ban size={14} />
            {relation?.is_sanctioned ? 'Remover Sanções' : 'Aplicar Sanções'}
          </button>
          <button
            onClick={handleEmbassy}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1
              ${relation?.has_embassy 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' 
                : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/10'}`}
          >
            <Landmark size={14} />
            {relation?.has_embassy ? 'Destruir Embaixada' : 'Construir Embaixada'}
          </button>
          <button
            onClick={() => handleSendMoney(1000000)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors border border-green-500/20 flex items-center gap-1"
          >
            <Coins size={14} />
            Enviar R$ 1M
          </button>
          <button
            onClick={() => setShowMessageModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors border border-purple-500/20 flex items-center gap-1"
          >
            <Send size={14} />
            Mensagem
          </button>
          <button
            onClick={handleDeclareWar}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1
              ${relation?.status === 'war' 
                ? 'bg-red-500/20 text-red-400 border border-red-500/20' 
                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-transparent'}`}
          >
            <Swords size={14} />
            {relation?.status === 'war' ? 'Em Guerra' : 'Declarar Guerra'}
          </button>
        </div>
      )}

      {relation && (
        <div className="mt-4 px-4 flex justify-center">
          <div className="flex flex-wrap gap-2 justify-center">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              ${relation.status === 'ally' ? 'bg-green-500/20 text-green-400 border border-green-500/20' :
                relation.status === 'war' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                relation.status === 'sanctioned' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' :
                'bg-white/5 text-white/50 border border-white/10'}`}
            >
              <Shield size={16} />
              Relação: {relation.status === 'ally' ? '🤝 Aliado' : 
                relation.status === 'war' ? '⚔️ Guerra' : 
                relation.status === 'sanctioned' ? '🚫 Sanções' : 
                '🤝 Neutro'}
            </div>
            {relation.is_sanctioned && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">
                <Ban size={14} /> Sanções Ativas
              </span>
            )}
            {relation.has_embassy && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/20">
                <Landmark size={14} /> Embaixada
              </span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 px-4">
          <p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl">{error}</p>
        </div>
      )}
      {success && (
        <div className="mt-4 px-4">
          <p className="text-green-400 text-sm bg-green-500/10 p-3 rounded-xl">{success}</p>
        </div>
      )}

      <div className="mt-6 px-4">
        <div className="bg-surface-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-3 text-white/40 text-xs font-bold tracking-widest uppercase">
            <Trophy size={14} /> GUERRAS
          </div>
          <div className="flex gap-4">
            <div className="flex-1 bg-black/40 rounded-xl p-3 text-center border border-green-500/20">
              <p className="text-green-400 font-bold text-lg">0</p>
              <p className="text-white/40 text-xs">Vencidas</p>
            </div>
            <div className="flex-1 bg-black/40 rounded-xl p-3 text-center border border-red-500/20">
              <p className="text-red-400 font-bold text-lg">0</p>
              <p className="text-white/40 text-xs">Perdidas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 px-4">
        <div className="bg-surface-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-3 text-white/40 text-xs font-bold tracking-widest uppercase">
            <Package size={14} /> RECURSOS NO ARMAZÉM
          </div>
          {economy ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-black/40 rounded-xl p-2 text-center">
                <p className="text-white font-bold text-sm">{economy.food || 0}</p>
                <p className="text-white/40 text-[10px]">Comida</p>
              </div>
              <div className="bg-black/40 rounded-xl p-2 text-center">
                <p className="text-white font-bold text-sm">{economy.gold || 0}</p>
                <p className="text-white/40 text-[10px]">Ouro</p>
              </div>
              <div className="bg-black/40 rounded-xl p-2 text-center">
                <p className="text-white font-bold text-sm">{economy.iron || 0}</p>
                <p className="text-white/40 text-[10px]">Ferro</p>
              </div>
              <div className="bg-black/40 rounded-xl p-2 text-center">
                <p className="text-white font-bold text-sm">{economy.oil || 0}</p>
                <p className="text-white/40 text-[10px]">Petróleo</p>
              </div>
              <div className="bg-black/40 rounded-xl p-2 text-center">
                <p className="text-white font-bold text-sm">{economy.wood || 0}</p>
                <p className="text-white/40 text-[10px]">Madeira</p>
              </div>
              <div className="bg-black/40 rounded-xl p-2 text-center">
                <p className="text-white font-bold text-sm">{economy.uranium || 0}</p>
                <p className="text-white/40 text-[10px]">Urânio</p>
              </div>
              <div className="bg-black/40 rounded-xl p-2 text-center">
                <p className="text-white font-bold text-sm">{economy.coal || 0}</p>
                <p className="text-white/40 text-[10px]">Carvão</p>
              </div>
              <div className="bg-black/40 rounded-xl p-2 text-center">
                <p className="text-white font-bold text-sm">{economy.steel || 0}</p>
                <p className="text-white/40 text-[10px]">Aço</p>
              </div>
              <div className="bg-black/40 rounded-xl p-2 text-center">
                <p className="text-white font-bold text-sm">{economy.energy || 0}</p>
                <p className="text-white/40 text-[10px]">Energia</p>
              </div>
            </div>
          ) : (
            <p className="text-white/30 text-sm text-center py-2">Sem dados de economia</p>
          )}
        </div>
      </div>

      <div className="mt-6 px-4">
        <div className="bg-surface-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-3 text-white/40 text-xs font-bold tracking-widest uppercase">
            <Building2 size={14} /> REGIÕES ({regions.length})
          </div>

          {regions.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">Nenhuma região cadastrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs border-b border-white/5">
                    <th className="text-left py-2 font-medium">Nome</th>
                    <th className="text-right py-2 font-medium">Km² usados</th>
                    <th className="text-right py-2 font-medium">Edifícios</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((region: any) => (
                    <tr key={region.id} className="border-b border-white/5 last:border-0">
                      <td className="py-2 text-white font-medium">{region.name}</td>
                      <td className="py-2 text-white/70 text-right">{region.used_area || 0}</td>
                      <td className="py-2 text-white/70 text-right">{buildingsCount[region.id] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 px-4">
        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4">
          <h3 className="text-white/60 text-xs font-bold tracking-widest uppercase mb-3">📋 INFORMAÇÕES</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/40">Capital</span>
              <span className="text-white">{country.capital}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/40">Líder</span>
              <span className="text-white">{country.leader_title} {country.leader_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/40">Estrutura</span>
              <span className="text-white">{country.state_structure}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/40">Religião</span>
              <span className="text-white">{country.religion}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/40">Idioma</span>
              <span className="text-white">{country.language}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/40">Moeda</span>
              <span className="text-white">{country.currency}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4">
          <h3 className="text-white/60 text-xs font-bold tracking-widest uppercase mb-3">📊 ESTATÍSTICAS</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/40">Confiança</span>
              <span className="text-white">{country.trust}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/40">Dinheiro</span>
              <span className="text-white">{(economy?.money || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/40">Poluição</span>
              <span className="text-white">{economy?.pollution || 0}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-white/40">Fundado em</span>
              <span className="text-white">{new Date(country.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-white/40">Tipo</span>
              <span className="text-white">{country.is_active ? '👤 Jogador' : '🤖 NPC'}</span>
            </div>
          </div>
        </div>
      </div>

      {country.motto && (
        <div className="mt-4 px-4 bg-[#1a1a1a] border border-white/5 rounded-xl p-4 text-center">
          <p className="text-white/40 text-xs font-bold tracking-widest uppercase mb-1">LEMA NACIONAL</p>
          <p className="text-white/70 italic">"{country.motto}"</p>
        </div>
      )}

      {showTreatyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">📜 Enviar Tratado</h3>
              <button onClick={() => setShowTreatyModal(false)} className="text-white/40 hover:text-white/70 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm block mb-1.5">Tipo de Tratado</label>
                <select
                  value={selectedTreaty}
                  onChange={(e) => setSelectedTreaty(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="">Selecione um tratado</option>
                  {TREATIES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} - {t.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/60 text-sm block mb-1.5">Mensagem (opcional)</label>
                <textarea
                  value={treatyMessage}
                  onChange={(e) => setTreatyMessage(e.target.value)}
                  placeholder="Escreva uma mensagem para o país..."
                  className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-primary transition-colors resize-none h-24"
                />
              </div>

              <button
                onClick={handleSendTreaty}
                disabled={!selectedTreaty}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar Tratado
              </button>
            </div>
          </div>
        </div>
      )}

      {showMessageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">📨 Enviar Mensagem Diplomática</h3>
              <button onClick={() => setShowMessageModal(false)} className="text-white/40 hover:text-white/70 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm block mb-1.5">Escolha o tom da mensagem</label>
                <select
                  value={selectedMessage}
                  onChange={(e) => setSelectedMessage(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="">Selecione uma mensagem...</option>
                  {DIPLOMATIC_MESSAGES.map((msg) => (
                    <option key={msg.id} value={msg.id}>
                      {msg.title} ({msg.effect_relation > 0 ? '+' : ''}{msg.effect_relation} relação)
                    </option>
                  ))}
                </select>
              </div>

              {selectedMessage && (() => {
                const foundMsg = DIPLOMATIC_MESSAGES.find(m => m.id === selectedMessage);
                if (!foundMsg) return null;
                return (
                  <div className="bg-[#0a0a0a] rounded-xl p-3 border border-white/5">
                    <p className="text-white/70 text-sm italic">"{foundMsg.content}"</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded">
                        Relação: {foundMsg.effect_relation > 0 ? '+' : ''}{foundMsg.effect_relation}
                      </span>
                      <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">
                        Aprovação: {foundMsg.effect_approval > 0 ? '+' : ''}{foundMsg.effect_approval}
                      </span>
                      <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded">
                        Confiança: {foundMsg.effect_trust > 0 ? '+' : ''}{foundMsg.effect_trust}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={handleSendMessage}
                disabled={!selectedMessage}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar Mensagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}