'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { Database } from '@/types/database'
import { 
  ArrowLeft, Shield, Landmark, Flag, Crown, Send, X, 
  Package, Trophy, Swords, Ban, FileText, ChevronRight,
  Mail, ArrowRightLeft, Eye, Book, Activity, Coins, Map, Crosshair, Users, Server, ThumbsUp, Image as ImageIcon, Plus, Minus,
  Music, Landmark as LandmarkIcon, Heart
} from 'lucide-react'
import { formatMoney, formatNumber } from '@/utils/format'

// ✅ Importação Dinâmica do Mapa do Jogo
const DynamicMap = dynamic(() => import('@/components/DynamicMap'), { 
  ssr: false, 
  loading: () => <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">Carregando mapa...</div> 
})

// ─── TIPOS ──────────────────────────────────────────────
type CountryRow = Database['public']['Tables']['countries']['Row']
type DiplomacyRow = Database['public']['Tables']['diplomacy']['Row']
type UserRow = Database['public']['Tables']['users']['Row']
type EconomyRow = Database['public']['Tables']['economy']['Row']

type CountryInfo = {
  id: number
  name: string
  flag_emoji: string
  slug: string | null
}

const DIPLOMATIC_MESSAGES = [
  { id: 'formal_positive', title: '🌟 Mensagem de Amizade', content: 'O governo do seu país envia suas mais sinceras saudações e deseja estabelecer laços de cooperação e prosperidade mútua.', effect_relation: 15, effect_approval: 5, effect_trust: 5 },
  { id: 'formal_negative', title: '📜 Nota de Repúdio', content: 'O governo do seu país expressa sua profunda preocupação com as recentes ações do seu governo, que consideramos uma ameaça à estabilidade regional.', effect_relation: -20, effect_approval: -5, effect_trust: -10 },
  { id: 'insult', title: '🤬 Insulto Grave', content: 'Vocês são um bando de incompetentes e a sua liderança é um lixo! Não passam de um país de terceira categoria!', effect_relation: -50, effect_approval: -20, effect_trust: -30 },
  { id: 'threat', title: '⚡ Ameaça de Guerra', content: 'Seu país está brincando com fogo. Se continuar com essa atitude, não hesitaremos em usar todos os meios necessários para proteger nossos interesses.', effect_relation: -40, effect_approval: -15, effect_trust: -20 },
]

const TRANSLATIONS: Record<string, string> = {
  "Brasil": "Brazil", "Estados Unidos": "United States of America", "Rússia": "Russia", "China": "China",
  "Argentina": "Argentina", "Canadá": "Canada", "Reino Unido": "United Kingdom", "França": "France",
  "Alemanha": "Germany", "Japão": "Japan", "Itália": "Italy", "Espanha": "Spain", "Portugal": "Portugal",
  "México": "Mexico", "Índia": "India", "Austrália": "Australia",
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
  
  const [totalPop, setTotalPop] = useState(0)
  const [totalPollution, setTotalPollution] = useState(0)

  const [allies, setAllies] = useState<CountryInfo[]>([])
  const [enemies, setEnemies] = useState<CountryInfo[]>([])
  const [sanctioned, setSanctioned] = useState<CountryInfo[]>([])
  const [warStats, setWarStats] = useState({ wins: 0, losses: 0 })

  const [expandedRegions, setExpandedRegions] = useState(false)
  const [hasRecommended, setHasRecommended] = useState(false)

  const [isFightingAlongside, setIsFightingAlongside] = useState(false)
  const [isFightingAgainst, setIsFightingAgainst] = useState(false)

  // ─── BANNER CARROSSEL ──────────────────────────────────
  const [bannerIndex, setBannerIndex] = useState(0)
  const bannerImages = userProfile?.banner_urls || []
  const hasBanner = bannerImages.length > 0
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // ─── ÁUDIO DO HINO ─────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null)

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
  const [showGalleryModal, setShowGalleryModal] = useState(false)
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

      // ✅ Registra a atividade do jogador e a visita ao país
      if (user?.id && myCountry?.id) {
        await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('user_id', user.id)
        if (Number(slug) !== myCountry.id) {
          await supabase.rpc('increment_country_visits', { p_country_id: Number(slug) })
        }
      }

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

      const { data: userData } = await supabase.from('users').select('*').eq('country_id', countryData.id).maybeSingle<UserRow>()
      if (userData) setUserProfile(userData)

      const { data: econData } = await supabase.from('economy').select('*').eq('country_id', countryData.id).maybeSingle<EconomyRow>()
      if (econData) setEconomy(econData)

      const { data: regionsData } = await supabase.from('regions').select('*').eq('country_id', countryData.id)
      if (regionsData && regionsData.length > 0) {
        setRegions(regionsData)
        
        const popSum = regionsData.reduce((acc: number, r: any) => acc + (r.population || 0), 0)
        const polSum = regionsData.reduce((acc: number, r: any) => acc + (r.pollution || 0), 0)
        
        setTotalPop(popSum)
        setTotalPollution(polSum)

        const regionIds = regionsData.map((r: any) => r.id)
        if (regionIds.length > 0) {
          const { data: buildingsData } = await supabase.from('buildings').select('region_id, quantity').in('region_id', regionIds)
          if (buildingsData) {
            const count: Record<string, number> = {}
            buildingsData.forEach((b: any) => {
              count[b.region_id] = (count[b.region_id] || 0) + (b.quantity || 1)
            })
            setBuildingsCount(count)
          }
        }
      }

      const { data: warsData } = await supabase
        .from('wars').select('*').or(`attacker_id.eq.${countryData.id},defender_id.eq.${countryData.id}`).eq('status', 'active')
      
      if (myCountry?.id) {
        let fightingAgainst = false
        let fightingAlongside = false
        for (const w of warsData || []) {
          if ((w.attacker_id === myCountry.id && w.defender_id === countryData.id) || (w.defender_id === myCountry.id && w.attacker_id === countryData.id)) fightingAgainst = true
          else if (w.attacker_id === countryData.id || w.defender_id === countryData.id) {
            const { data: myPart } = await supabase.from('war_participants').select('side').eq('war_id', w.id).eq('country_id', myCountry.id).maybeSingle()
            if (myPart) fightingAlongside = true
          }
        }
        setIsFightingAgainst(fightingAgainst)
        setIsFightingAlongside(fightingAlongside)
      }

      if (user && myCountry?.id && countryData.id !== myCountry.id) {
        const { data: relData } = await supabase
          .from('diplomacy').select('*').or(`country_a_id.eq.${myCountry.id},country_b_id.eq.${myCountry.id}`).or(`country_a_id.eq.${countryData.id},country_b_id.eq.${countryData.id}`).maybeSingle<DiplomacyRow>()

        if (relData) setRelation(relData)
        else {
          const { data: newRel } = await supabase.from('diplomacy').insert({
            country_a_id: Math.min(myCountry.id, countryData.id),
            country_b_id: Math.max(myCountry.id, countryData.id),
            status: 'neutral', relation_score: 50, has_embassy: false, sanctions_active: false,
          }).select().single<DiplomacyRow>()
          if (newRel) setRelation(newRel)
        }
      }

      const { data: allWars } = await supabase.from('wars').select('winner_id').or(`attacker_id.eq.${countryData.id},defender_id.eq.${countryData.id}`).in('status', ['ended', 'peace'])
      let wins = 0, losses = 0
      allWars?.forEach(w => {
        if (w.winner_id === countryData.id) wins++
        else if (w.winner_id !== null) losses++
      })
      setWarStats({ wins, losses })

      const { data: relsData } = await supabase
        .from('diplomacy')
        .select(`
          country_a_id, country_b_id, status, sanctions_active, relation_score,
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
          if (r.status === 'ally' || (r.relation_score ?? 0) >= 76) alliesList.push(other)
          if (r.sanctions_active) sanctionedList.push(other)
        })
      }
      setAllies(alliesList)
      setSanctioned(sanctionedList)

      if (warsData && warsData.length > 0) {
        const enemyIds = warsData.map(w => w.attacker_id === countryData.id ? w.defender_id : w.attacker_id)
        const { data: enemyData } = await supabase.from('countries').select('id, name, flag_emoji, slug').in('id', enemyIds)
        setEnemies(enemyData || [])
      } else setEnemies([])

      setLoading(false)
    }

    if (slug) fetchCountry()
  }, [slug, user, myCountry])

  // ─── AÇÕES ──────────────────────────────────────────────
  async function handleSendMessage() {
    if (!selectedMessage || !user || !myCountry || !country || isMyCountry) return
    setError(''); setSuccess(''); setSending(true)

    const msg = DIPLOMATIC_MESSAGES.find(m => m.id === selectedMessage)
    if (!msg) { setError('Mensagem não encontrada'); setSending(false); return }

    try {
      await supabase.from('country_messages').insert({ from_country: myCountry.id, to_country: country.id, content: msg.content, is_read: false })

      const currentScore = relation?.relation_score ?? 50
      const newScore = Math.min(100, currentScore + msg.effect_relation)
      await supabase.from('diplomacy').upsert({
        country_a_id: Math.min(myCountry.id, country.id),
        country_b_id: Math.max(myCountry.id, country.id),
        relation_score: newScore, updated_at: new Date().toISOString(),
      }, { onConflict: 'country_a_id, country_b_id' })

      const { data: fromCountry } = await supabase.from('countries').select('governability').eq('id', myCountry.id).single()
      if (fromCountry) {
        const typedFromCountry = fromCountry as unknown as { governability: number | null }
        const currentGov = typedFromCountry.governability ?? 50
        const newGov = Math.max(0, Math.min(100, currentGov + msg.effect_trust))
        await supabase.from('countries').update({ governability: newGov }).eq('id', myCountry.id)
      }

      await supabase.rpc('notify_country', { p_country_id: country.id, p_message: msg.content, p_title: `${msg.title} de ${myCountry.name}`, p_type: 'message' })

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

  async function handleEmbassy(e?: React.MouseEvent) {
    if (e) e.preventDefault()
    if (!user || !myCountry || !country || isMyCountry) return

    const hasEmbassy = relation?.has_embassy === true
    if (!hasEmbassy) {
      const { data: econ } = await supabase.from('economy').select('money').eq('country_id', myCountry.id).single()
      if (!econ || econ.money < 100000000) { setError('❌ Dinheiro insuficiente (R$ 100.000.000)'); return }
      await supabase.from('economy').update({ money: econ.money - 100000000 }).eq('country_id', myCountry.id)
    }

    try {
      const scoreChange = hasEmbassy ? -20 : 10
      const newScore = Math.min(100, (relation?.relation_score ?? 50) + scoreChange)
      await supabase.from('diplomacy').upsert({
        country_a_id: Math.min(myCountry.id, country.id),
        country_b_id: Math.max(myCountry.id, country.id),
        has_embassy: !hasEmbassy, relation_score: newScore, updated_at: new Date().toISOString(),
      }, { onConflict: 'country_a_id, country_b_id' })

      setRelation(prev => prev ? { ...prev, has_embassy: !hasEmbassy, relation_score: newScore } : null)
      setSuccess(hasEmbassy ? '💥 Embaixada destruída! (-20).' : '✅ Embaixada construída! (+10).')
    } catch (err: any) {
      setError(err.message || 'Erro ao construir/destruir embaixada')
    }
    setTimeout(() => setSuccess(''), 4000)
  }

  async function handleRecommend() {
    if (isMyCountry || !country) return;
    const action = hasRecommended ? 'remove' : 'add';
    
    setHasRecommended(!hasRecommended);
    setCountry(prev => prev ? {
      ...prev,
      recommendations_count: Math.max(0, (prev.recommendations_count ?? 0) + (action === 'add' ? 1 : -1))
    } : null);

    await supabase.rpc('toggle_country_recommendation', { 
      p_country_id: country.id, 
      p_action: action 
    });
  }

  // ─── LOADING / ERRO ──────────────────────────────────────
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
  if (error || !country) return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><h1 className="text-4xl font-bold text-white">404</h1><Link href="/game/home" className="btn-primary">Voltar</Link></div>

  const relationScore = relation?.relation_score ?? 50
  let relColor = 'text-white/70', relBg = 'bg-white/10', relBorder = 'border-white/20', relLabel = 'Neutro', relEmoji = '⚪', progressColor = 'bg-white/50'
  if (relationScore >= 76) { relLabel = 'Aliado'; relEmoji = '💙'; relColor = 'text-blue-400'; relBg = 'bg-blue-500/20'; relBorder = 'border-blue-500/30'; progressColor = 'bg-blue-500'; }
  else if (relationScore >= 56) { relLabel = 'Amigo'; relEmoji = '💚'; relColor = 'text-green-400'; relBg = 'bg-green-500/20'; relBorder = 'border-green-500/30'; progressColor = 'bg-green-500'; }
  else if (relationScore >= 46) { relLabel = 'Neutro'; relEmoji = '⚪'; relColor = 'text-white/70'; relBg = 'bg-white/10'; relBorder = 'border-white/20'; progressColor = 'bg-white/50'; }
  else if (relationScore >= 26) { relLabel = 'Tensão'; relEmoji = '⚠️'; relColor = 'text-yellow-400'; relBg = 'bg-yellow-500/20'; relBorder = 'border-yellow-500/30'; progressColor = 'bg-yellow-500'; }
  else { relLabel = 'Inimigo'; relEmoji = '💔'; relColor = 'text-red-400'; relBg = 'bg-red-500/20'; relBorder = 'border-red-500/30'; progressColor = 'bg-red-500'; }

  const hasEmbassy = relation?.has_embassy === true
  const countryGov = country.governability ?? 0
  const totalInfra = Object.values(buildingsCount).reduce((a, b) => a + b, 0) * 10
  const totalBuildings = Object.values(buildingsCount).reduce((a, b) => a + b, 0)
  
  const lastLogin = userProfile?.last_login ? new Date(userProfile.last_login).getTime() : 0
  const isOnline = Date.now() - lastLogin < 5 * 60 * 1000
  const roleLabel = country.is_active ? 'Jogador' : 'NPC'

  const displayedRegions = expandedRegions ? regions : regions.slice(0, 1)
  const mapFocusName = TRANSLATIONS[country.name] || country.name

  return (
    // ✅ pt-68 mantido, mas sem a barra azul
    <div className="max-w-5xl mx-auto pb-10 px-4 pt-68">
      
      {/* BANNER */}
      <div className="relative w-full h-72 sm:h-80 rounded-lg overflow-hidden bg-[#0a0f18] border-2 border-[#1e3a8a] shadow-2xl mb-4 group">
        {hasBanner ? (
          <img 
            src={bannerImages[bannerIndex]} 
            alt={country.name} 
            className="w-full h-full object-cover object-center opacity-100 transition-transform duration-700" 
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-8xl text-white/5"><Flag size={120} /></div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

        {/* ✅ Botão Voltar flutuante sobre o banner */}
        <button onClick={() => router.back()} className="absolute top-4 left-4 z-20 bg-black/60 hover:bg-black/90 text-white p-2.5 rounded-full backdrop-blur-md border border-white/20 transition-all">
          <ArrowLeft size={20} />
        </button>

        {/* ✅ Bandeira e Nomes no canto */}
        <div className="absolute bottom-4 left-4 flex items-center gap-4 z-10 bg-black/40 p-3 rounded-lg backdrop-blur-sm border border-white/10">
          <div className="w-20 h-14 rounded border-2 border-white/20 overflow-hidden shadow-lg bg-black shrink-0">
            {userProfile?.flag_url ? (
              <img src={userProfile.flag_url} alt="Flag" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-white/30">{country.flag_emoji}</div>
            )}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-widest">{country.name}</h2>
            <p className="text-[10px] sm:text-xs text-primary/80 font-mono font-bold uppercase tracking-widest mt-1">CAPITAL: {country.capital}</p>
          </div>
        </div>
      </div>

      {/* RELAÇÃO */}
      {relation && (
        <div className="mb-4">
          <div className="bg-surface-card rounded-xl p-4 border border-surface-border shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-white/40" />
                <span className="text-white/40 text-xs font-bold tracking-widest uppercase">RELAÇÃO DIPLOMÁTICA</span>
              </div>
              <span className={`text-sm font-bold ${relColor}`}>{relationScore}% {relLabel}</span>
            </div>
            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden flex relative mb-3">
              <div className={`h-full ${progressColor} transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(100, relationScore))}%` }} />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${relBg} ${relColor} ${relBorder}`}>{relEmoji} {relLabel}</span>
              {hasEmbassy && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">🏛️ Embaixada</span>}
              {relation.sanctions_active && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">🚫 Sancionado</span>}
              {isFightingAgainst && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">⚔️ Em Guerra</span>}
            </div>
          </div>
        </div>
      )}

      {/* BOTÕES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <ActionButton icon={<Mail size={16}/>} label="Mensagem" onClick={() => setShowMessageModal(true)} disabled={isMyCountry} />
        <ActionButton icon={<Landmark size={16}/>} label={hasEmbassy ? "Destruir Embaixada" : "Construir Embaixada"} onClick={handleEmbassy} disabled={isMyCountry} />
        <ActionButton icon={<FileText size={16}/>} label="Projetos Nacionais" onClick={() => alert('Em breve!')} disabled={isMyCountry} />
        
        {isMyCountry ? (
          <ActionButton icon={<ArrowRightLeft size={16}/>} label="Oferta Comercial" disabled />
        ) : (
          <Link href="/game/mercado" className="contents"><ActionButton icon={<ArrowRightLeft size={16}/>} label="Oferta Comercial" /></Link>
        )}
        
        {isMyCountry ? (
          <ActionButton icon={<Swords size={16}/>} label="Declarar Guerra" disabled />
        ) : (
          <Link href="/game/parlamento" className="contents"><ActionButton icon={<Swords size={16}/>} label="Declarar Guerra" /></Link>
        )}

        <Link href="/game/orcamento" className="contents"><ActionButton icon={<Activity size={16}/>} label="Atividade" /></Link>

        {isMyCountry ? (
          <ActionButton icon={<Ban size={16}/>} label="Sanções" disabled />
        ) : (
          <Link href="/game/parlamento" className="contents"><ActionButton icon={<Ban size={16}/>} label="Sanções" /></Link>
        )}

        <ActionButton icon={<ImageIcon size={16}/>} label="Galeria" onClick={() => setShowGalleryModal(true)} />
      </div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* COLUNA ESQUERDA */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden shadow-lg">
            <div className="bg-[#1e3a8a] px-4 py-2 flex items-center justify-center gap-2"><Landmark size={16} className="text-white" /><h2 className="text-white font-bold text-sm uppercase tracking-widest">Informações Básicas</h2></div>
            <div className="flex flex-col">
              <TableRow label="Nação" value={country.name} />
              <TableRow label={country.leader_title || 'Líder'} value={country.leader_name || 'Desconhecido'} />
              <TableRow label="ID da Nação" value={`${country.id}`} icon={<Shield size={12} className="text-blue-400"/>} />
              <TableRow label="Role" value={roleLabel} />
              <TableRow label="Atividade" value={isOnline ? 'Online' : 'Offline'} bold />
            </div>
          </div>

          <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden shadow-lg">
            <div className="bg-[#1e3a8a] px-4 py-2 flex items-center justify-center gap-2"><Flag size={16} className="text-white" /><h2 className="text-white font-bold text-sm uppercase tracking-widest">Doméstico</h2></div>
            <div className="flex flex-col">
              <TableRow label="Sistema" value={country.systems || 'Democracia'} />
              <TableRow label="Estrutura" value={country.state_structure || 'República'} />
              <TableRow label="Capital" value={country.capital} />
              <TableRow label="Religião" value={country.religion || 'Nenhuma'} />
              <TableRow label="Lema" value={country.motto || 'Nenhum'} />
              <TableRow label="Idioma" value={country.language || 'Inglês'} />
              <TableRow label="Governabilidade" value={`${countryGov}%`} />
            </div>
          </div>

          {/* SÍMBOLOS NACIONAIS E POLÍTICAS */}
          <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden shadow-lg">
            <div className="bg-[#1e3a8a] px-4 py-2 flex items-center justify-center gap-2"><Crown size={16} className="text-white" /><h2 className="text-white font-bold text-sm uppercase tracking-widest">Símbolos Nacionais</h2></div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-3 bg-black/20 border border-surface-border rounded-lg">
                <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest mb-2">Animal Oficial</p>
                {/* ✅ object-contain mantém a proporção */}
                <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/10 bg-black/50 mb-3 shadow-inner flex items-center justify-center p-1">
                  {country.animal_image_url ? <img src={country.animal_image_url} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>}
                </div>
                <p className="text-white font-bold text-sm text-center">{country.official_animal || 'Nenhum'}</p>
              </div>
              
              <div className="flex flex-col items-center p-3 bg-black/20 border border-surface-border rounded-lg">
                <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest mb-2">Moeda</p>
                {/* ✅ object-contain mantém a proporção */}
                <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/10 bg-black/50 mb-3 shadow-inner flex items-center justify-center p-1">
                  {country.currency_logo_url ? <img src={country.currency_logo_url} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-3xl">💰</div>}
                </div>
                <p className="text-white font-bold text-sm text-center">{country.currency || 'Dólar'}</p>
              </div>
            </div>
            
            <div className="flex flex-col border-t border-surface-border">
              <TableRow label="Política Doméstica" value={country.domestic_policy || 'Não definida'} />
              <TableRow label="Políticas Sociais" value={country.social_policies || 'Não definidas'} />
              <TableRow label="Política de Guerra" value={country.war_policy || 'Não definida'} />
            </div>
          </div>

          <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden shadow-lg">
            <div className="bg-[#1e3a8a] px-4 py-2 flex items-center justify-center gap-2"><Flag size={16} className="text-white" /><h2 className="text-white font-bold text-sm uppercase tracking-widest">Relações Internacionais</h2></div>
            <div className="flex flex-col">
              <TableRow label="Visitas à Página" value={country.visits_count ?? 0} />
              <TableRow label="Recomendação" value={
                <button onClick={handleRecommend} disabled={isMyCountry} className={`flex items-center gap-1 ${hasRecommended ? 'text-blue-400' : 'text-white/60 hover:text-white disabled:opacity-50'}`}>
                  <ThumbsUp size={14} fill={hasRecommended ? 'currentColor' : 'none'} /> {country.recommendations_count ?? 0}
                </button>
              } />
              <TableRow label="Países Aliados" value={allies.map(a=>a.name).join(', ') || 'Nenhum'} />
              <TableRow label="Países Inimigos" value={enemies.map(e=>e.name).join(', ') || 'Nenhum'} />
              <TableRow label="Sanções Aplicadas" value={sanctioned.map(s=>s.name).join(', ') || 'Nenhuma'} />
              <TableRow label="Sanções Recebidas" value={sanctioned.map(s=>s.name).join(', ') || 'Nenhuma'} />
              <TableRow label="Guerras Vencidas" value={warStats.wins} />
              <TableRow label="Guerras Perdidas" value={warStats.losses} />
            </div>
          </div>

          <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden shadow-lg">
            <div className="bg-[#1e3a8a] px-4 py-2 flex items-center justify-center gap-2"><Coins size={16} className="text-white" /><h2 className="text-white font-bold text-sm uppercase tracking-widest">Economia</h2></div>
            <div className="flex flex-col">
              <TableRow label="População" value={formatNumber(totalPop)} />
              <TableRow label="Dinheiro" value={formatMoney(economy?.money || 0)} bold />
              <TableRow label="Receitas" value={formatMoney(economy?.revenue || 0)} />
              <TableRow label="Despesas" value={formatMoney(economy?.expenses || 0)} />
              <TableRow label="Exportação" value={formatMoney(economy?.exports || 0)} />
              <TableRow label="Importação" value={formatMoney(economy?.imports || 0)} />
              <TableRow label="Poluição" value={`${formatNumber(totalPollution)} Pts`} />
              <TableRow label="Inflação" value={`${Number(economy?.inflation || 0).toFixed(1)}%`} />
              <TableRow label="IDH" value={Number(economy?.idh || 0).toFixed(3)} />
              <TableRow label="Edifícios" value={totalBuildings} />
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden shadow-lg flex flex-col items-center p-5 text-center">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Crown size={14} /> Chefe de Estado
            </h3>
            
            <div className="w-40 h-52 rounded-lg overflow-hidden border border-surface-border bg-black/50 mb-3 relative shadow-inner">
              {userProfile?.leader_url ? (
                <img src={userProfile.leader_url} alt="Líder" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <Crown size={48} />
                </div>
              )}
            </div>
            
            <p className="text-white font-bold text-lg">{country.leader_name || 'Sem Líder'}</p>
            <p className="text-primary text-xs uppercase font-bold tracking-widest mb-4">{country.leader_title}</p>

            <div className="w-full bg-black/40 border border-surface-border rounded-lg p-3 text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-white/70">
                  <Music size={14} className="text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Hino Nacional</span>
                </div>
              </div>
              
              {country.anthem_audio_url ? (
                <div className="flex flex-col gap-2">
                  <p className="text-white text-xs font-bold truncate">{country.anthem_name || 'Hino Oficial'}</p>
                  <audio 
                    ref={audioRef}
                    src={country.anthem_audio_url} 
                    className="w-full h-8" 
                    controls 
                  />
                </div>
              ) : (
                <p className="text-[10px] text-white/30 italic">Nenhum áudio registrado.</p>
              )}
            </div>
          </div>

          <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden shadow-lg flex flex-col h-64 relative z-0">
            <div className="bg-[#1e3a8a] px-4 py-2 flex items-center justify-center gap-2 z-10 relative">
              <Map size={16} className="text-white" />
              <h2 className="text-white font-bold text-sm uppercase tracking-widest">Mapa</h2>
            </div>
            <div className="flex-1 relative">
              <DynamicMap focusCountryName={mapFocusName} />
            </div>
          </div>

          <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden shadow-lg flex-1">
            <div className="bg-[#1e3a8a] px-4 py-2 flex items-center justify-center gap-2">
              <Landmark size={16} className="text-white" />
              <h2 className="text-white font-bold text-sm uppercase tracking-widest">Regiões [{regions.length}]</h2>
            </div>
            <div className="flex flex-col">
              {regions.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-4">Nenhuma região cadastrada</p>
              ) : (
                <>
                  {displayedRegions.map((r: any) => (
                    <div key={r.id} className="flex border-b border-surface-border last:border-0 group hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="w-1/2 p-3 border-r border-surface-border">
                        <Link href={`/game/regiao/${r.id}`} className="text-blue-400 font-bold text-sm hover:underline block mb-1">{r.name}</Link>
                        <p className="text-white/70 text-xs font-mono">Pop: {formatNumber(r.population || 0)}</p>
                        <p className="text-white/70 text-xs font-mono">Infra: {(totalInfra / (regions.length || 1)).toFixed(2)}</p>
                        <p className="text-white/70 text-xs font-mono">Poluição: {formatNumber(r.pollution || 0)}</p>
                      </div>
                      <div className="w-1/2 bg-black/50 relative overflow-hidden">
                        {r.image_url ? <img src={r.image_url} alt={r.name} className="w-full h-full object-cover opacity-80" /> : <div className="w-full h-full flex items-center justify-center text-white/10"><Landmark size={24} /></div>}
                      </div>
                    </div>
                  ))}
                  
                  {regions.length > 1 && (
                    <button onClick={() => setExpandedRegions(!expandedRegions)} className="w-full py-2 bg-surface-input hover:bg-white/5 text-white/60 hover:text-white transition-colors flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-widest border-t border-surface-border">
                      {expandedRegions ? <><Minus size={14}/> Ocultar Regiões</> : <><Plus size={14}/> Ver Todas as Regiões ({regions.length})</>}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RECURSOS */}
      <div className="mt-6">
        <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden shadow-lg">
          <div className="bg-[#1e3a8a] px-4 py-2 flex items-center justify-center gap-2">
            <Package size={16} className="text-white" />
            <h2 className="text-white font-bold text-sm uppercase tracking-widest">Recursos</h2>
          </div>
          <div className="p-4">
            {economy ? (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Comida', value: economy.food }, { label: 'Ouro', value: economy.gold },
                  { label: 'Ferro', value: economy.iron }, { label: 'Petróleo', value: economy.oil },
                  { label: 'Madeira', value: economy.wood }, { label: 'Urânio', value: economy.uranium },
                  { label: 'Carvão', value: economy.coal }, { label: 'Aço', value: economy.steel },
                  { label: 'Energia', value: economy.energy },
                ].map((res, i) => (
                  <div key={i} className="bg-[#060A14] rounded-xl p-4 flex flex-col items-center justify-center border border-white/5 shadow-inner">
                    <p className="text-white font-black text-lg font-mono leading-none mb-1">{formatNumber(res.value || 0)}</p>
                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">{res.label}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-white/30 text-sm text-center py-2">Sem dados de economia</p>}
          </div>
        </div>
      </div>

      {/* MODAL: MENSAGEM */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card border border-surface-border rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2"><Mail size={18} /> Enviar Mensagem</h3>
              <button onClick={() => setShowMessageModal(false)} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <select value={selectedMessage} onChange={(e) => setSelectedMessage(e.target.value)} className="input-field w-full bg-surface-input">
                <option value="">Selecione uma mensagem...</option>
                {DIPLOMATIC_MESSAGES.map((msg) => (
                  <option key={msg.id} value={msg.id}>{msg.title} ({msg.effect_relation > 0 ? '+' : ''}{msg.effect_relation} relação)</option>
                ))}
              </select>
              <button onClick={handleSendMessage} disabled={!selectedMessage || sending} className="btn-primary w-full py-2">
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GALERIA */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card border border-surface-border rounded-xl p-6 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-surface-border pb-3">
              <h3 className="text-white font-bold flex items-center gap-2"><ImageIcon size={18} /> Galeria - {country.name}</h3>
              <button onClick={() => setShowGalleryModal(false)} className="text-white/40 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto custom-scrollbar flex-1 p-2">
              {bannerImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {bannerImages.map((url, i) => (
                    <div key={i} className="aspect-video bg-black/50 rounded-lg overflow-hidden border border-white/10">
                      <img src={url} alt={`Galeria ${i+1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-center py-8">Nenhuma imagem na galeria.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── COMPONENTES AUXILIARES ──────────────────────────────
function ActionButton({ icon, label, onClick, disabled }: { icon: React.ReactNode, label: string, onClick?: () => void, disabled?: boolean }) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className="bg-surface-card border border-surface-border rounded-md px-2 py-3 flex items-center justify-center gap-2 text-xs font-bold text-white/70 transition-colors shadow-sm 
                 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-surface-input hover:enabled:text-white"
    >
      <span className="text-primary">{icon}</span> {label}
    </button>
  )
}

function TableRow({ label, value, bold, icon }: { label: string, value: React.ReactNode, bold?: boolean, icon?: React.ReactNode }) {
  return (
    <div className="flex text-sm border-b border-surface-border last:border-0">
      <div className="w-[45%] bg-black/20 p-2 font-semibold text-white/60 flex items-center gap-2">
        {label} {icon}
      </div>
      <div className={`w-[55%] p-2 font-mono flex items-center ${bold ? 'text-white font-bold bg-white/5' : 'text-white/80'}`}>
        {value}
      </div>
    </div>
  )
}