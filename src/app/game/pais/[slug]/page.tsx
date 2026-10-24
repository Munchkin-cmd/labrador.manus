'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { Database } from '@/types/database'
import { 
  ArrowLeft, Coins, Shield, Landmark, Flag, Crown, Send, X, Building2,
  Package, Trophy, Swords, Ban, FileText, ChevronRight
} from 'lucide-react'
import { formatMoney, formatNumber } from '@/utils/format'

// ─── TIPOS ──────────────────────────────────────────────
type CountryRow = Database['public']['Tables']['countries']['Row']
type DiplomacyRow = Database['public']['Tables']['diplomacy']['Row']
type UserRow = Database['public']['Tables']['users']['Row']
type EconomyRow = Database['public']['Tables']['economy']['Row']
type WarRow = Database['public']['Tables']['wars']['Row']

type CountryInfo = {
  id: number
  name: string
  flag_emoji: string
  slug: string | null
}

// ─── MENSAGENS DIPLOMÁTICAS ──────────────────────────────
const DIPLOMATIC_MESSAGES = [
  { id: 'formal_positive', title: '🌟 Mensagem de Amizade', content: 'O governo do seu país envia suas mais sinceras saudações e deseja estabelecer laços de cooperação e prosperidade mútua.', effect_relation: 15, effect_approval: 5, effect_trust: 5 },
  { id: 'formal_negative', title: '📜 Nota de Repúdio', content: 'O governo do seu país expressa sua profunda preocupação com as recentes ações do seu governo, que consideramos uma ameaça à estabilidade regional.', effect_relation: -20, effect_approval: -5, effect_trust: -10 },
  { id: 'insult', title: '🤬 Insulto Grave', content: 'Vocês são um bando de incompetentes e a sua liderança é um lixo! Não passam de um país de terceira categoria!', effect_relation: -50, effect_approval: -20, effect_trust: -30 },
  { id: 'threat', title: '⚡ Ameaça de Guerra', content: 'Seu país está brincando com fogo. Se continuar com essa atitude, não hesitaremos em usar todos os meios necessários para proteger nossos interesses.', effect_relation: -40, effect_approval: -15, effect_trust: -20 },
]

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
  const [activeWars, setActiveWars] = useState<WarRow[]>([])
  
  // ✅ Novos Estados
  const [allies, setAllies] = useState<CountryInfo[]>([])
  const [enemies, setEnemies] = useState<CountryInfo[]>([])
  const [sanctioned, setSanctioned] = useState<CountryInfo[]>([])
  const [topArticle, setTopArticle] = useState<any | null>(null)

  const [isFightingAlongside, setIsFightingAlongside] = useState(false)
  const [isFightingAgainst, setIsFightingAgainst] = useState(false)

  // ─── BANNER CARROSSEL ──────────────────────────────────
  const [bannerIndex, setBannerIndex] = useState(0)
  const bannerImages = userProfile?.banner_urls || []
  const hasBanner = bannerImages.length > 0
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (hasBanner && bannerImages.length > 1) {
      intervalRef.current = setInterval(() => {
        setBannerIndex((prev) => (prev + 1) % bannerImages.length)
      }, 5000)
    }
  }

  useEffect(() => {
    startTimer()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [bannerImages.length])

  const goToSlide = (index: number) => {
    setBannerIndex(index)
    startTimer()
  }

  // ─── MODAIS E FEEDBACK ───────────────────────────────────
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sending, setSending] = useState(false)

  const isMyCountry = myCountry?.id === country?.id

  // ─── BUSCAR DADOS ──────────────────────────────────────
  useEffect(() => {
    async function fetchCountry() {
      setLoading(true)
      setError('')

      let query = supabase.from('countries').select('*')
      if (!isNaN(Number(slug))) {
        query = query.eq('id', Number(slug))
      } else {
        query = query.eq('slug', slug)
      }

      const { data: countryData, error: countryError } = await query.maybeSingle<CountryRow>()

      if (countryError || !countryData) {
        setError('País não encontrado')
        setLoading(false)
        return
      }

      setCountry(countryData)

      // Perfil do usuário
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('country_id', countryData.id)
        .maybeSingle<UserRow>()
      if (userData) setUserProfile(userData)

      // Economia
      const { data: econData } = await supabase
        .from('economy')
        .select('*')
        .eq('country_id', countryData.id)
        .maybeSingle<EconomyRow>()
      if (econData) setEconomy(econData)

      // Regiões
      const { data: regionsData } = await supabase
        .from('regions')
        .select('*')
        .eq('country_id', countryData.id)
        
      if (regionsData && regionsData.length > 0) {
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
              count[b.region_id] = (count[b.region_id] || 0) + (b.quantity || 1)
            })
            setBuildingsCount(count)
          }
        }
      }

      // Guerras ativas (Inimigos)
      const { data: warsData } = await supabase
        .from('wars')
        .select('*')
        .or(`attacker_id.eq.${countryData.id},defender_id.eq.${countryData.id}`)
        .eq('status', 'active')
      
      setActiveWars(warsData || [])

      // Lógica de guerra (contra ou a favor do meu país)
      if (myCountry?.id) {
        let fightingAgainst = false
        let fightingAlongside = false

        for (const w of warsData || []) {
          if (
            (w.attacker_id === myCountry.id && w.defender_id === countryData.id) ||
            (w.defender_id === myCountry.id && w.attacker_id === countryData.id)
          ) {
            fightingAgainst = true
          } else if (
            w.attacker_id === countryData.id || w.defender_id === countryData.id
          ) {
            const { data: myPart } = await supabase
              .from('war_participants')
              .select('side')
              .eq('war_id', w.id)
              .eq('country_id', myCountry.id)
              .maybeSingle()
            
            if (myPart) fightingAlongside = true
          }
        }
        setIsFightingAgainst(fightingAgainst)
        setIsFightingAlongside(fightingAlongside)
      }

      // Relação diplomática
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
          const { data: newRel } = await supabase
            .from('diplomacy')
            .insert({
              country_a_id: Math.min(myCountry.id, countryData.id),
              country_b_id: Math.max(myCountry.id, countryData.id),
              status: 'neutral',
              relation_score: 50,
              has_embassy: false,
              sanctions_active: false,
            })
            .select()
            .single<DiplomacyRow>()
          if (newRel) setRelation(newRel)
        }
      }

      // Relações (Aliados, Inimigos, Sancionados)
      const { data: relsData } = await supabase
        .from('diplomacy')
        .select(`
          country_a_id, 
          country_b_id, 
          status, 
          sanctions_active,
          country_a:countries!diplomacy_country_a_id_fkey(id, name, flag_emoji, slug),
          country_b:countries!diplomacy_country_b_id_fkey(id, name, flag_emoji, slug)
        `)
        .or(`country_a_id.eq.${countryData.id},country_b_id.eq.${countryData.id}`)

      const alliesList: CountryInfo[] = []
      const sanctionedList: CountryInfo[] = []

      if (relsData) {
        relsData.forEach((r: any) => {
          const isA = r.country_a_id === countryData.id
          const other = isA ? r.country_b : r.country_a
          
          if (r.status === 'ally') alliesList.push(other)
          if (r.sanctions_active) sanctionedList.push(other)
        })
      }
      
      setAllies(alliesList)
      setSanctioned(sanctionedList)

      // Inimigos (via warsData)
      if (warsData && warsData.length > 0) {
        const enemyIds = warsData.map(w => w.attacker_id === countryData.id ? w.defender_id : w.attacker_id)
        const { data: enemyData } = await supabase.from('countries').select('id, name, flag_emoji, slug').in('id', enemyIds)
        setEnemies(enemyData || [])
      } else {
        setEnemies([])
      }

      // Artigo Principal (Mais votado)
      const { data: articleData } = await supabase
        .from('articles')
        .select('id, title, content, likes, dislikes, category, created_at, image_url')
        .eq('country_id', countryData.id)
        .order('likes', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (articleData) setTopArticle(articleData)

      setLoading(false)
    }

    if (slug) fetchCountry()
  }, [slug, user, myCountry])

  // ─── AÇÕES ──────────────────────────────────────────────

  async function handleSendMessage() {
    if (!selectedMessage || !user || !myCountry || !country || isMyCountry) return

    setError('')
    setSuccess('')
    setSending(true)

    const msg = DIPLOMATIC_MESSAGES.find(m => m.id === selectedMessage)
    if (!msg) {
      setError('Mensagem não encontrada')
      setSending(false)
      return
    }

    try {
      await supabase.from('country_messages').insert({
        from_country: myCountry.id,
        to_country: country.id,
        content: msg.content,
        is_read: false,
      })

      const newScore = Math.max(0, Math.min(100, (relation?.relation_score || 50) + msg.effect_relation))
      await supabase
        .from('diplomacy')
        .upsert({
          country_a_id: Math.min(myCountry.id, country.id),
          country_b_id: Math.max(myCountry.id, country.id),
          relation_score: newScore,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'country_a_id, country_b_id' })

      const { data: fromCountry } = await supabase
        .from('countries')
        .select('intl_approval, trust')
        .eq('id', myCountry.id)
        .single()
        
      if (fromCountry) {
        const newApproval = Math.max(0, Math.min(100, (fromCountry.intl_approval || 50) + msg.effect_approval))
        const newTrust = Math.max(0, Math.min(100, (fromCountry.trust || 50) + msg.effect_trust))
        await supabase
          .from('countries')
          .update({ intl_approval: newApproval, trust: newTrust })
          .eq('id', myCountry.id)
      }

      await supabase.rpc('notify_country', {
        p_country_id: country.id,
        p_message: msg.content, 
        p_title: `${msg.title} de ${myCountry.name}`,
        p_type: 'message',
      })

      setSuccess(`✅ ${msg.title} enviada com sucesso!`)
      setShowMessageModal(false)
      setSelectedMessage('')
      
      setRelation(prev => prev ? { ...prev, relation_score: newScore } : null)
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar mensagem')
    } finally {
      setSending(false)
      setTimeout(() => setSuccess(''), 4000)
    }
  }

  async function handleSendMoney(e?: React.MouseEvent) {
    if (e) e.preventDefault()
    if (!user || !myCountry || !country || isMyCountry) return
    setError('')
    setSuccess('')

    const amount = 1000000000 // 1 Bilhão

    try {
      const { data, error } = await supabase.rpc('transfer_money', {
        p_from: myCountry.id,
        p_to: country.id,
        p_amount: amount,
      }) as { data: RpcResponse | null; error: any }

      if (error || !data?.success) {
        setError(data?.error || error?.message || 'Erro ao transferir dinheiro')
        return
      }

      // Aumentar relação diplomática em +20
      const newScore = Math.max(0, Math.min(100, (relation?.relation_score || 50) + 20))
      await supabase
        .from('diplomacy')
        .upsert({
          country_a_id: Math.min(myCountry.id, country.id),
          country_b_id: Math.max(myCountry.id, country.id),
          relation_score: newScore,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'country_a_id, country_b_id' })

      setRelation(prev => prev ? { ...prev, relation_score: newScore } : null)
      
      setSuccess(`✅ Doação realizada com sucesso! Relação melhorou (+20).`)
      if (economy) {
        setEconomy({ ...economy, money: (economy.money || 0) - amount })
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao transferir dinheiro')
    }
    setTimeout(() => setSuccess(''), 4000)
  }

  async function handleEmbassy(e?: React.MouseEvent) {
    if (e) e.preventDefault()
    if (!user || !myCountry || !country || isMyCountry) return

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
      const scoreChange = hasEmbassy ? -20 : 10
      const newScore = Math.max(0, Math.min(100, (relation?.relation_score || 50) + scoreChange))

      await supabase
        .from('diplomacy')
        .upsert({
          country_a_id: Math.min(myCountry.id, country.id),
          country_b_id: Math.max(myCountry.id, country.id),
          has_embassy: !hasEmbassy,
          relation_score: newScore,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'country_a_id, country_b_id' })

      setRelation(prev => prev ? { ...prev, has_embassy: !hasEmbassy, relation_score: newScore } : null)
      setSuccess(hasEmbassy ? '💥 Embaixada destruída! A relação azedou (-20).' : '✅ Embaixada construída! A relação melhorou (+10).')
    } catch (err: any) {
      setError(err.message || 'Erro ao construir/destruir embaixada')
    }
    setTimeout(() => setSuccess(''), 4000)
  }

  // ─── LOADING / ERRO ──────────────────────────────────────
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
        <Link href="/game/home" className="btn-primary">Voltar ao início</Link>
      </div>
    )
  }

  const relationScore = relation?.relation_score || 50
  
  let relColor = 'text-white/70'
  let relBg = 'bg-white/10'
  let relBorder = 'border-white/20'
  let relLabel = 'Neutro'
  let relEmoji = '⚪'
  let progressColor = 'bg-white/50'

  if (relationScore >= 76) {
    relLabel = 'Aliado'; relEmoji = '💙'; relColor = 'text-blue-400'; relBg = 'bg-blue-500/20'; relBorder = 'border-blue-500/30'; progressColor = 'bg-blue-500';
  } else if (relationScore >= 56) {
    relLabel = 'Amigo'; relEmoji = '💚'; relColor = 'text-green-400'; relBg = 'bg-green-500/20'; relBorder = 'border-green-500/30'; progressColor = 'bg-green-500';
  } else if (relationScore >= 46) {
    relLabel = 'Neutro'; relEmoji = '⚪'; relColor = 'text-white/70'; relBg = 'bg-white/10'; relBorder = 'border-white/20'; progressColor = 'bg-white/50';
  } else if (relationScore >= 26) {
    relLabel = 'Tensão'; relEmoji = '⚠️'; relColor = 'text-yellow-400'; relBg = 'bg-yellow-500/20'; relBorder = 'border-yellow-500/30'; progressColor = 'bg-yellow-500';
  } else {
    relLabel = 'Inimigo'; relEmoji = '💔'; relColor = 'text-red-400'; relBg = 'bg-red-500/20'; relBorder = 'border-red-500/30'; progressColor = 'bg-red-500';
  }

  const isSanctioned = relation?.sanctions_active === true
  const hasEmbassy = relation?.has_embassy === true
  const isWar = relation?.status === 'war' || isFightingAgainst

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 pt-4">
        <button onClick={() => router.back()} className="text-white/50 hover:text-white transition-colors p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">Perfil do País</h1>
      </div>

      {/* ✅ BANNER LIMPO (Sem sobreposição) */}
      <div className="relative w-full h-48 rounded-t-xl overflow-hidden bg-gradient-to-r from-primary/30 to-primary/5 border border-white/10 border-b-0">
        {hasBanner ? (
          <>
            <img src={bannerImages[bannerIndex]} alt={country.name} className="w-full h-full object-cover transition-opacity duration-700" />
            {bannerImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {bannerImages.map((_, idx) => (
                  <button key={idx} onClick={(e) => { e.stopPropagation(); goToSlide(idx) }}
                    className={`w-2 h-2 rounded-full transition-all ${idx === bannerIndex ? 'bg-primary w-4' : 'bg-white/30 hover:bg-white/50'}`} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl text-white/10">🌍</div>
        )}
      </div>

      {/* ✅ CABEÇALHO ABAIXO DO BANNER */}
      <div className="bg-surface-card rounded-b-xl border border-white/10 border-t-0 p-4 flex flex-col sm:flex-row items-center gap-4 justify-between shadow-lg">
        <div className="flex items-center gap-4">
          {/* Bandeira */}
          <div className="w-16 h-16 rounded-full border-2 border-primary overflow-hidden bg-black/80 shrink-0">
            {userProfile?.flag_url ? (
              <img src={userProfile.flag_url} alt={country.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-white/30"><Flag size={24} /></div>
            )}
          </div>
          {/* Líder */}
          <div className="w-16 h-16 rounded-full border-2 border-white/20 overflow-hidden bg-black/80 shrink-0">
            {userProfile?.leader_url ? (
              <img src={userProfile.leader_url} alt={country.leader_name || 'Líder'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-white/30"><Crown size={24} /></div>
            )}
          </div>
          {/* Nome */}
          <div className="text-left">
            <h2 className="text-2xl font-bold text-white leading-tight">{country.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-white/50">{country.capital}</span>
              {!country.is_active && <span className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full">NPC</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ BOTÕES CORRIGIDOS */}
      {user && !isMyCountry && (
        <div className="mt-4 px-4 flex flex-wrap justify-center gap-2">
          <button 
            type="button"
            onClick={() => setShowMessageModal(true)} 
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors border border-purple-500/20 flex items-center gap-1"
          >
            <Send size={14} /> Mensagem
          </button>
          
          <button 
            type="button"
            onClick={handleSendMoney} 
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors border border-green-500/20 flex items-center gap-1"
          >
            <Coins size={14} /> Enviar R$ 1B
          </button>
          
          <button 
            type="button"
            onClick={handleEmbassy} 
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${hasEmbassy ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'}`}
          >
            <Landmark size={14} /> {hasEmbassy ? 'Destruir Embaixada (-20 Rel)' : 'Construir Embaixada (+10 Rel)'}
          </button>
        </div>
      )}

      {error && <div className="mt-3 px-4"><p className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</p></div>}
      {success && <div className="mt-3 px-4"><p className="text-green-400 text-sm bg-green-500/10 p-3 rounded-xl border border-green-500/20">{success}</p></div>}

      {/* RELAÇÃO */}
      {relation && (
        <div className="mt-4 px-4">
          <div className="bg-surface-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-white/40" />
                <span className="text-white/40 text-xs font-bold tracking-widest uppercase">RELAÇÃO DIPLOMÁTICA</span>
              </div>
              <span className={`text-sm font-bold ${relColor}`}>{relationScore}% {relLabel}</span>
            </div>
            
            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden flex relative mb-3">
              <div className={`h-full ${progressColor} transition-all duration-500`} style={{ width: `${relationScore}%` }} />
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${relBg} ${relColor} ${relBorder}`}>
                {relEmoji} {relLabel}
              </span>
              
              {hasEmbassy && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  🏛️ Embaixada
                </span>
              )}
              
              {isSanctioned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  🚫 Sancionado
                </span>
              )}

              {isWar && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                  ⚔️ Em Guerra contra você
                </span>
              )}

              {isFightingAlongside && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                  🤝 Aliado na Guerra
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ NOVAS LISTAS DIPLOMÁTICAS */}
      <div className="mt-4 px-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Aliados */}
        <div className="bg-surface-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2 text-white/60 text-xs font-bold uppercase">
            <Shield size={14} className="text-blue-400" /> Aliados
          </div>
          {allies.length === 0 ? (
            <p className="text-white/30 text-xs italic">Nenhum aliado.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {allies.map(a => (
                <Link key={a.id} href={`/game/pais/${a.slug || a.id}`} className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded text-xs text-blue-400 hover:bg-blue-500/20 transition-colors">
                  <span>{a.flag_emoji}</span> {a.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Inimigos */}
        <div className="bg-surface-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2 text-white/60 text-xs font-bold uppercase">
            <Swords size={14} className="text-red-400" /> Em Guerra
          </div>
          {enemies.length === 0 ? (
            <p className="text-white/30 text-xs italic">Em paz.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {enemies.map(e => (
                <Link key={e.id} href={`/game/pais/${e.slug || e.id}`} className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/20 transition-colors">
                  <span>{e.flag_emoji}</span> {e.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sancionados */}
        <div className="bg-surface-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-2 text-white/60 text-xs font-bold uppercase">
            <Ban size={14} className="text-orange-400" /> Sancionados
          </div>
          {sanctioned.length === 0 ? (
            <p className="text-white/30 text-xs italic">Nenhum país sancionado.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {sanctioned.map(s => (
                <Link key={s.id} href={`/game/pais/${s.slug || s.id}`} className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded text-xs text-orange-400 hover:bg-orange-500/20 transition-colors">
                  <span>{s.flag_emoji}</span> {s.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LEMA */}
      {country.motto && (
        <div className="mt-4 px-4">
          <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4 text-center">
            <p className="text-white/40 text-xs font-bold tracking-widest uppercase mb-1">LEMA NACIONAL</p>
            <p className="text-white/70 italic">"{country.motto}"</p>
          </div>
        </div>
      )}

      {/* GUERRAS */}
      <div className="mt-4 px-4">
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

      {/* RECURSOS */}
      <div className="mt-4 px-4">
        <div className="bg-surface-card rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-3 text-white/40 text-xs font-bold tracking-widest uppercase">
            <Package size={14} /> RECURSOS
          </div>
          {economy ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-black/40 rounded-xl p-2 text-center"><p className="text-white font-bold text-sm">{economy.food || 0}</p><p className="text-white/40 text-[10px]">Comida</p></div>
              <div className="bg-black/40 rounded-xl p-2 text-center"><p className="text-white font-bold text-sm">{economy.gold || 0}</p><p className="text-white/40 text-[10px]">Ouro</p></div>
              <div className="bg-black/40 rounded-xl p-2 text-center"><p className="text-white font-bold text-sm">{economy.iron || 0}</p><p className="text-white/40 text-[10px]">Ferro</p></div>
              <div className="bg-black/40 rounded-xl p-2 text-center"><p className="text-white font-bold text-sm">{economy.oil || 0}</p><p className="text-white/40 text-[10px]">Petróleo</p></div>
              <div className="bg-black/40 rounded-xl p-2 text-center"><p className="text-white font-bold text-sm">{economy.wood || 0}</p><p className="text-white/40 text-[10px]">Madeira</p></div>
              <div className="bg-black/40 rounded-xl p-2 text-center"><p className="text-white font-bold text-sm">{economy.uranium || 0}</p><p className="text-white/40 text-[10px]">Urânio</p></div>
              <div className="bg-black/40 rounded-xl p-2 text-center"><p className="text-white font-bold text-sm">{economy.coal || 0}</p><p className="text-white/40 text-[10px]">Carvão</p></div>
              <div className="bg-black/40 rounded-xl p-2 text-center"><p className="text-white font-bold text-sm">{economy.steel || 0}</p><p className="text-white/40 text-[10px]">Aço</p></div>
              <div className="bg-black/40 rounded-xl p-2 text-center"><p className="text-white font-bold text-sm">{economy.energy || 0}</p><p className="text-white/40 text-[10px]">Energia</p></div>
            </div>
          ) : (
            <p className="text-white/30 text-sm text-center py-2">Sem dados de economia</p>
          )}
        </div>
      </div>

      {/* REGIÕES */}
      <div className="mt-4 px-4">
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
                    <th className="text-right py-2 font-medium">Edifícios</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((region: any) => (
                    <tr key={region.id} className="border-b border-white/5 last:border-0">
                      <td className="py-2 text-white font-medium">{region.name}</td>
                      <td className="py-2 text-white/70 text-right">{buildingsCount[region.id] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* INFORMAÇÕES E ESTATÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 px-4">
        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4">
          <h3 className="text-white/60 text-xs font-bold tracking-widest uppercase mb-3">📋 INFORMAÇÕES</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-white/5"><span className="text-white/40">Capital</span><span className="text-white">{country.capital}</span></div>
            <div className="flex justify-between py-1 border-b border-white/5"><span className="text-white/40">Líder</span><span className="text-white">{country.leader_title} {country.leader_name}</span></div>
            <div className="flex justify-between py-1 border-b border-white/5"><span className="text-white/40">Estrutura</span><span className="text-white">{country.state_structure}</span></div>
            <div className="flex justify-between py-1 border-b border-white/5"><span className="text-white/40">Religião</span><span className="text-white">{country.religion}</span></div>
            <div className="flex justify-between py-1 border-b border-white/5"><span className="text-white/40">Idioma</span><span className="text-white">{country.language}</span></div>
            <div className="flex justify-between py-1 border-b border-white/5"><span className="text-white/40">Moeda</span><span className="text-white">{country.currency}</span></div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4">
          <h3 className="text-white/60 text-xs font-bold tracking-widest uppercase mb-3">📊 ESTATÍSTICAS</h3>
          <div className="space-y-2 text-sm">
            {/* ✅ NOVOS INDICADORES */}
            <div className="flex justify-between py-1 border-b border-white/5"><span className="text-white/40">IDH</span><span className="text-blue-400 font-bold">{(economy as any)?.idh ? Number((economy as any).idh).toFixed(3) : '0.040'}</span></div>
            <div className="flex justify-between py-1 border-b border-white/5"><span className="text-white/40">Cresc. Populacional</span><span className="text-green-400 font-bold">+{Number((economy as any)?.population_growth || 0).toFixed(1)}%</span></div>
            <div className="flex justify-between py-1 border-b border-white/5"><span className="text-white/40">Inflação</span><span className={Number((economy as any)?.inflation || 0) > 10 ? 'text-red-400 font-bold' : 'text-yellow-400 font-bold'}>{Number((economy as any)?.inflation || 0).toFixed(1)}%</span></div>
            
            <div className="flex justify-between py-1 border-b border-white/5"><span className="text-white/40">Confiança</span><span className="text-white">{country.trust}%</span></div>
            <div className="flex justify-between py-1 border-b border-white/5"><span className="text-white/40">Dinheiro</span><span className="text-white">{formatMoney(economy?.money || 0)}</span></div>
            <div className="flex justify-between py-1 border-b border-white/5"><span className="text-white/40">Poluição</span><span className="text-white">{economy?.pollution || 0}%</span></div>
            <div className="flex justify-between py-1 border-b border-white/5"><span className="text-white/40">Fundado em</span><span className="text-white">{new Date(country.created_at).toLocaleDateString('pt-BR')}</span></div>
            <div className="flex justify-between py-1"><span className="text-white/40">Tipo</span><span className="text-white">{country.is_active ? '👤 Jogador' : '🤖 NPC'}</span></div>
          </div>
        </div>
      </div>

      {/* ✅ ARTIGO PRINCIPAL (Mais votado) */}
      {topArticle && (
        <div className="mt-4 px-4 mb-4">
          <div className="bg-surface-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-3 text-white/40 text-xs font-bold tracking-widest uppercase">
              <FileText size={14} /> ARTIGO EM DESTAQUE
            </div>
            {/* ✅ CORREÇÃO DO LINK AQUI: Trocado de /game/noticias/ para /game/feed/ */}
            <Link href={`/game/feed/${topArticle.id}`} className="block group">
              <div className="bg-black/40 rounded-xl p-4 border border-white/5 group-hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider">{topArticle.category}</span>
                  <span className="text-[10px] text-white/40">{new Date(topArticle.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <h4 className="text-white font-bold text-lg mb-1 group-hover:text-primary transition-colors">{topArticle.title}</h4>
                <p className="text-white/60 text-sm line-clamp-2">{topArticle.content}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-white/40 font-mono">
                  <span className="text-green-400">👍 {formatNumber(topArticle.likes)}</span>
                  <span className="text-red-400">👎 {formatNumber(topArticle.dislikes)}</span>
                  <span className="ml-auto flex items-center gap-1 text-primary group-hover:underline">Ler artigo <ChevronRight size={14} /></span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* MODAL DE MENSAGEM */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">📨 Enviar Mensagem</h3>
              <button type="button" onClick={() => setShowMessageModal(false)} className="text-white/40 hover:text-white/70 transition-colors"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm block mb-1.5">Tom da mensagem</label>
                <select value={selectedMessage} onChange={(e) => setSelectedMessage(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-2 rounded-xl focus:outline-none focus:border-primary transition-colors">
                  <option value="">Selecione uma mensagem...</option>
                  {DIPLOMATIC_MESSAGES.map((msg) => (
                    <option key={msg.id} value={msg.id}>
                      {msg.title} ({msg.effect_relation > 0 ? '+' : ''}{msg.effect_relation} relação)
                    </option>
                  ))}
                </select>
              </div>

              {selectedMessage && (() => {
                const foundMsg = DIPLOMATIC_MESSAGES.find(m => m.id === selectedMessage)
                if (!foundMsg) return null
                return (
                  <div className="bg-[#0a0a0a] rounded-xl p-3 border border-white/5">
                    <p className="text-white/70 text-sm italic">"{foundMsg.content}"</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded">Relação: {foundMsg.effect_relation > 0 ? '+' : ''}{foundMsg.effect_relation}</span>
                      <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">Aprovação: {foundMsg.effect_approval > 0 ? '+' : ''}{foundMsg.effect_approval}</span>
                      <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded">Confiança: {foundMsg.effect_trust > 0 ? '+' : ''}{foundMsg.effect_trust}</span>
                    </div>
                  </div>
                )
              })()}

              <button type="button" onClick={handleSendMessage} disabled={!selectedMessage || sending} className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {sending ? 'Enviando...' : 'Enviar Mensagem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}