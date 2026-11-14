'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import { MILITARY_IMAGES } from '@/components/buildingImages'
import { formatMoney, formatNumber } from '@/utils/format'
import { 
  Shield, Swords, Plane, Ship, Target, Bomb, Users, 
  Zap, CheckCircle2, XCircle, Minus, Plus, Loader2 
} from 'lucide-react'

const MILITARY_UNITS = [
  { key: 'soldiers', label: 'Soldados', icon: Users, requires: ['barracks'], description: 'Infantaria básica para ocupação e combate.' },
  { key: 'tanks', label: 'Tanques', icon: Shield, requires: ['weapons_factory'], description: 'Blindados pesados para quebrar linhas inimigas.' },
  { key: 'artillery', label: 'Artilharia', icon: Bomb, requires: ['weapons_factory'], description: 'Fogo de longo alcance.' },
  { key: 'aircraft', label: 'Aeronaves', icon: Plane, requires: ['barracks'], description: 'Superioridade aérea e bombardeios.' },
  { key: 'helicopters', label: 'Helicópteros', icon: Plane, requires: ['air_base'], description: 'Apoio aéreo e transporte rápido.' },
  { key: 'drones', label: 'Drones', icon: Target, requires: ['air_base'], description: 'Vigilância e ataques precisos.' },
  { key: 'missiles', label: 'Mísseis', icon: Swords, requires: ['weapons_factory'], description: 'Ataques de longa distância devastadores.' },
  { key: 'ships', label: 'Navios', icon: Ship, requires: ['drydock'], description: 'Poder naval para controle costeiro.' },
  { key: 'submarines', label: 'Submarinos', icon: Ship, requires: ['drydock'], description: 'Guerra naval furtiva.' },
  { key: 'warheads', label: 'Ogivas', icon: Zap, requires: ['weapons_factory', 'nuclear_power_plant'], description: 'Arma de destruição em massa.' },
]

const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1579912422987-aa812e1e1984?q=80&w=2000&auto=format&fit=crop'

type RpcResult = {
  success: boolean
  error?: string
  message?: string
}

export default function ArmyPage() {
  const { country } = useAuthStore()
  
  const [military, setMilitary] = useState<any>(null)
  const [buildings, setBuildings] = useState<any[]>([])
  const [catalog, setCatalog] = useState<any[]>([])
  const [bannerUrl, setBannerUrl] = useState<string | null>(null) // ✅ NOVO ESTADO
  const [loading, setLoading] = useState(true)
  
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, string | number>>({})
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null)

  async function fetchData() {
    if (!country?.id) return
    
    // ✅ CORREÇÃO: Adicionado a busca do banner militar do país
    const [milRes, bldRes, catRes, countryRes] = await Promise.all([
      supabase.from('military').select('*').eq('country_id', country.id).maybeSingle(),
      supabase.from('buildings').select('building_type').eq('country_id', country.id).eq('is_built', true),
      supabase.from('equipment_catalog').select('*'),
      supabase.from('countries').select('military_banner_url').eq('id', country.id).single()
    ])

    setMilitary(milRes.data || {})
    setBuildings(bldRes.data || [])
    setCatalog(catRes.data || [])
    
    // ✅ Define o banner se existir
    if (countryRes.data?.military_banner_url) {
      setBannerUrl(countryRes.data.military_banner_url)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [country?.id])

  const hasRequirements = (requires: string[]) => {
    const builtTypes = new Set(buildings.map(b => b.building_type))
    return requires.every(req => builtTypes.has(req))
  }

  async function handleHire(unitKey: string) {
    const qty = Number(quantities[unitKey]) || 1
    setIsProcessing(unitKey)
    setFeedback(null)

    const { data, error } = await supabase.rpc('produce_equipment', {
      p_country_id: country!.id,
      p_equip_type: unitKey,
      p_quantity: qty
    })

    const result = data as RpcResult

    if (error || !result?.success) {
      setFeedback({ type: 'error', msg: error?.message || result?.error || 'Erro ao produzir.' })
    } else {
      setFeedback({ type: 'success', msg: result.message || 'Tropas contratadas com sucesso!' })
      await fetchData()
      setQuantities({ ...quantities, [unitKey]: '' })
    }
    setIsProcessing(null)
  }

  async function handleFire(unitKey: string) {
    const qty = Number(quantities[unitKey]) || 1
    if (!confirm(`Tem certeza que deseja demitir ${qty} unidades? Você receberá 50% do valor de volta.`)) return
    
    setIsProcessing(unitKey)
    setFeedback(null)

    const { data, error } = await supabase.rpc('disband_equipment' as any, {
      p_country_id: country!.id,
      p_equip_type: unitKey,
      p_quantity: qty
    })

    const result = data as RpcResult

    if (error || !result?.success) {
      setFeedback({ type: 'error', msg: error?.message || result?.error || 'Erro ao demitir.' })
    } else {
      setFeedback({ type: 'success', msg: result.message || 'Tropas demitidas com sucesso!' })
      await fetchData()
      setQuantities({ ...quantities, [unitKey]: '' })
    }
    setIsProcessing(null)
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="flex flex-col pb-24 max-w-7xl mx-auto w-full pt-68">
      
      {/* ✅ BANNER DINÂMICO: Usa o do banco, senão usa o padrão */}
      <div className="relative w-full h-48 md:h-64 shadow-2xl">
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ backgroundImage: `url(${bannerUrl || DEFAULT_BANNER})` }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f18] via-black/50 to-transparent" />
        <div className="absolute bottom-0 w-full p-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-black/60 rounded-xl border border-white/20 flex items-center justify-center backdrop-blur-md">
            <Swords className="text-primary" size={32} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg uppercase tracking-wider">Comando Militar</h1>
            <p className="text-white/60 font-mono text-sm mt-1">Recrute e gerencie as forças armadas da sua nação.</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-8">
        
        {feedback && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 font-mono text-sm ${
            feedback.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            {feedback.msg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {MILITARY_UNITS.map(unit => {
            const eqCatalog = catalog.find(c => c.type === unit.key)
            const isUnlocked = hasRequirements(unit.requires)
            const owned = military?.[unit.key] || 0
            const processing = isProcessing === unit.key
            
            const cost = eqCatalog?.cost_money || 0
            const upkeep = eqCatalog?.maint_money || 0
            const imgSrc = MILITARY_IMAGES?.[unit.key] || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=400&auto=format&fit=crop'

            return (
              <div 
                key={unit.key} 
                className={`bg-surface-card border rounded-xl overflow-hidden flex flex-col transition-all ${
                  isUnlocked ? 'border-surface-border shadow-lg' : 'border-red-500/20 opacity-70 grayscale-[50%]'
                }`}
              >
                <div className="w-full h-32 relative bg-black/50">
                  <img src={imgSrc} alt={unit.label} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-black/80 px-2.5 py-1 rounded-md border border-white/20 backdrop-blur-md">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Qtd: <strong className="text-primary text-sm">{formatNumber(owned)}</strong></span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <unit.icon size={18} className="text-primary" /> {unit.label}
                    </h3>
                    {isUnlocked ? (
                      <span title="Requisitos Atendidos"><CheckCircle2 size={18} className="text-green-400" /></span>
                    ) : (
                      <span title="Requisitos Não Atendidos"><XCircle size={18} className="text-red-400" /></span>
                    )}
                  </div>
                  
                  <p className="text-xs text-white/50 mb-4 h-8">{unit.description}</p>

                  <div className="bg-black/30 rounded-lg p-3 text-xs font-mono mb-4 flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-white/50">Custo unitário:</span>
                      <span className="text-green-400 font-bold">{formatMoney(cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Manutenção:</span>
                      <span className="text-red-400 font-bold">{formatMoney(upkeep)} / turno</span>
                    </div>
                  </div>

                  {!isUnlocked && (
                    <div className="mb-4 text-[10px] text-red-400 font-mono bg-red-500/10 p-2 rounded border border-red-500/20">
                      Requer: {unit.requires.join(', ')}
                    </div>
                  )}

                  {isUnlocked && (
                    <div className="mt-auto">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleFire(unit.key)}
                          disabled={processing || owned < (Number(quantities[unit.key]) || 1)}
                          className="w-10 h-10 shrink-0 bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white rounded-lg flex items-center justify-center transition-colors shadow-md"
                          title="Demitir tropas"
                        >
                          <Minus size={18} strokeWidth={3} />
                        </button>

                        <input 
                          type="number" 
                          min={1}
                          value={quantities[unit.key] === undefined ? '' : quantities[unit.key]}
                          onChange={(e) => {
                            const val = e.target.value
                            setQuantities({ ...quantities, [unit.key]: val === '' ? '' : Number(val) })
                          }}
                          placeholder="Qtd"
                          className="w-full bg-black/40 border border-white/10 rounded-lg text-center text-white font-mono font-bold py-2 focus:outline-none focus:border-primary placeholder:text-white/20"
                        />

                        <button 
                          onClick={() => handleHire(unit.key)}
                          disabled={processing}
                          className="w-10 h-10 shrink-0 bg-green-600 hover:bg-green-500 disabled:opacity-30 text-white rounded-lg flex items-center justify-center transition-colors shadow-md"
                          title="Contratar tropas"
                        >
                          {processing ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}