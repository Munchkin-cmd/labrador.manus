'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { formatMoney, formatNumber } from '@/utils/format'
import { ArrowLeft, Upload, Loader2, Hammer, Info } from 'lucide-react'
import { BUILDING_IMAGES } from '@/components/buildingImages' 

const DEFAULT_BG = 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2000&auto=format&fit=crop'
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=400&auto=format&fit=crop' 

type RpcResult = {
  success: boolean
  error?: string
  message?: string
}

export default function RegionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { country } = useAuthStore()
  const regionId = params.id as string

  const [region, setRegion] = useState<any>(null)
  const [economy, setEconomy] = useState<any>(null)
  const [catalog, setCatalog] = useState<any[]>([])
  const [buildings, setBuildings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [buildQty, setBuildQty] = useState<Record<string, number | undefined>>({})
  const [isBuilding, setIsBuilding] = useState<string | null>(null)

  async function loadData() {
    if (!regionId || !country?.id) return

    try {
      const [regionRes, ecoRes, catRes, bldRes] = await Promise.all([
        supabase.from('regions').select('*').eq('id', regionId).single(),
        supabase.from('economy').select('*').eq('country_id', country.id).maybeSingle(),
        supabase.from('building_catalog').select('*').order('category'),
        supabase.from('buildings').select('*').eq('region_id', regionId).eq('is_built', true)
      ])

      if (regionRes.error || !regionRes.data) {
        alert('Região não encontrada.')
        router.push('/game/regioes')
        return
      }

      setRegion(regionRes.data)
      setEconomy(ecoRes.data)
      setCatalog(catRes.data || [])
      setBuildings(bldRes.data || [])
      
      if (catRes.data && catRes.data.length > 0) {
        const categories = [...new Set(catRes.data.map(c => c.category))]
        setSelectedCategory(categories[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [regionId, country?.id])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !country?.id) return
    setUploading(true)
    
    const fileExt = file.name.split('.').pop()
    const filePath = `${country.id}_${regionId}_${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('regions').upload(filePath, file, { upsert: true })
    if (uploadError) {
      alert(`Erro no upload. O bucket 'regions' é público? Detalhe: ${uploadError.message}`)
      setUploading(false); return
    }

    const { data: urlData } = await supabase.storage.from('regions').getPublicUrl(filePath)
    await supabase.from('regions').update({ image_url: urlData.publicUrl }).eq('id', regionId)
    setRegion({ ...region, image_url: urlData.publicUrl })
    setUploading(false)
  }

  async function handleBuild(buildingType: string) {
    const qty = buildQty[buildingType] || 1
    setIsBuilding(buildingType)

    const { data, error } = await supabase.rpc('construct_building', {
      p_country_id: country!.id,
      p_region_id: regionId,
      p_building_type: buildingType,
      p_quantity: qty
    })

    const result = data as RpcResult
    if (error || !result?.success) {
      alert(`❌ Erro: ${error?.message || result?.error}`)
    } else {
      setBuildQty({ ...buildQty, [buildingType]: undefined })
      await loadData()
    }
    setIsBuilding(null)
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>

  const groupedCatalog = catalog.reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const categories = Object.keys(groupedCatalog)
  const currentCategoryItems = selectedCategory ? groupedCatalog[selectedCategory] : []

  // ✅ Dados exatos vindos da tabela de Regiões
  const population = region?.population || 0
  const populationGrowth = region?.population_growth || 0
  const pollution = region?.pollution || 0
  const diseases = region?.diseases || 0
  const terrain = region?.terrain || 'Desconhecido'
  
  // ✅ Infraestrutura = quantidade exata de edifícios na região
  const totalBuildings = buildings.reduce((acc, b) => acc + (b.quantity || 1), 0)

  return (
    <div className="flex flex-col pb-24 max-w-7xl mx-auto w-full pt-68">
      
      {/* BANNER */}
      <div className="relative w-full h-64 md:h-80 group">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${region.image_url || DEFAULT_BG})` }} />
        <div className="absolute inset-0 bg-black/40" />
        
        <Link href="/game/regioes" className="absolute top-4 left-4 z-10 bg-black/60 hover:bg-black/90 text-white p-2.5 rounded-full backdrop-blur-md transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <ArrowLeft size={16} /> Voltar
        </Link>

        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/90 text-white px-4 py-2.5 rounded-lg backdrop-blur-md transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {uploading ? 'Enviando...' : 'Alterar Foto'}
        </button>
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        
        <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-[#0a0f18] to-transparent">
          <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">{region.name}</h1>
        </div>
      </div>

      {/* ESTATÍSTICAS DA CIDADE */}
      <div className="bg-surface-card border-x border-b border-surface-border shadow-2xl mb-8">
        <div className="bg-primary/20 border-b border-primary/30 p-2 text-center">
          <h2 className="text-sm font-bold text-primary-light uppercase tracking-widest">Estatísticas da Cidade</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-surface-border text-sm font-mono">
          
          <div className="p-3 flex justify-between items-center">
            <span className="text-white/50">Infraestrutura</span> 
            <span className="text-white font-bold">{formatNumber(totalBuildings)}</span>
          </div>
          
          <div className="p-3 flex justify-between items-center">
            <span className="text-white/50">População</span> 
            <span className="text-white">{formatNumber(population)}</span>
          </div>
          
          <div className="p-3 flex justify-between items-center">
            <span className="text-white/50">Cresc. Populacional</span> 
            <span className={populationGrowth >= 0 ? 'text-green-400' : 'text-red-400'}>
              {populationGrowth > 0 ? '+' : ''}{Number(populationGrowth).toFixed(1)}%
            </span>
          </div>
          
          <div className="p-3 flex justify-between items-center">
            <span className="text-white/50">Poluição</span> 
            <span className="text-white">{Number(pollution).toFixed(1)} Pts</span>
          </div>
          
          <div className="p-3 flex justify-between items-center">
            <span className="text-white/50">Doenças</span> 
            <span className={diseases > 0 ? 'text-red-400' : 'text-green-400'}>
              {Number(diseases).toFixed(1)} Pts
            </span>
          </div>

          <div className="p-3 flex justify-between items-center capitalize">
            <span className="text-white/50">Terreno</span> 
            <span className="text-white">{terrain}</span>
          </div>

        </div>
      </div>

      {/* NAVEGAÇÃO DE CATEGORIAS E CONSTRUÇÕES */}
      <div className="px-4 flex flex-col lg:flex-row gap-8">
        
        {/* Menu Lateral de Categorias */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-1">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2 border-b border-white/10 pb-2">Melhorias ({totalBuildings})</h3>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-between ${
                selectedCategory === cat 
                  ? 'bg-primary/20 text-primary-light border border-primary/30' 
                  : 'text-white/60 hover:bg-white/5 border border-transparent'
              }`}
            >
              {cat}
              <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded text-white/50">
                {groupedCatalog[cat].reduce((acc, item) => acc + buildings.filter(b => b.building_type === item.type).reduce((sum, b) => sum + (b.quantity || 1), 0), 0)}
              </span>
            </button>
          ))}
        </div>

        {/* Lista de Prédios */}
        <div className="flex-1 flex flex-col gap-6">
          {currentCategoryItems.map(item => {
            const owned = buildings.filter(b => b.building_type === item.type).reduce((acc, b) => acc + (b.quantity || 1), 0)
            const isCurrentBuilding = isBuilding === item.type
            const imgSrc = BUILDING_IMAGES?.[item.type] || FALLBACK_IMG

            return (
              <div key={item.type} className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col md:flex-row gap-6 shadow-lg">
                
                {/* 1. Imagem e Título */}
                <div className="w-full md:w-48 shrink-0 flex flex-col gap-2">
                  <h4 className="text-white font-bold text-sm">{item.name}</h4>
                  <div className="w-full h-32 rounded-lg overflow-hidden border border-white/10 bg-black/50 relative">
                    <img src={imgSrc} alt={item.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs font-bold text-white border border-white/10">
                      {owned}
                    </div>
                  </div>
                </div>

                {/* 2. Controles (Build / Destroy) */}
                <div className="w-full md:w-40 shrink-0 flex flex-col gap-2 justify-center">
                  <button 
                    onClick={() => handleBuild(item.type)}
                    disabled={isCurrentBuilding}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2 rounded shadow transition-colors flex items-center justify-center gap-1 text-xs uppercase"
                  >
                    {isCurrentBuilding ? <Loader2 size={16} className="animate-spin" /> : 'Construir +'}
                  </button>
                  
                  {/* ✅ Input vazio para digitar o número que quiser */}
                  <input 
                    type="number" 
                    min={1}
                    placeholder="Qtd"
                    value={buildQty[item.type] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setBuildQty({ ...buildQty, [item.type]: val === '' ? undefined : Number(val) })
                    }}
                    className="w-full bg-black/50 border border-white/10 rounded py-1.5 text-center text-white font-mono text-sm focus:outline-none focus:border-primary placeholder:text-white/20"
                  />

                  <button 
                    onClick={() => alert('Função de demolir será implementada!')}
                    disabled={owned === 0}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white font-bold py-2 rounded shadow transition-colors text-xs uppercase"
                  >
                    Demolir -
                  </button>
                </div>

                {/* 3. Informações */}
                <div className="flex-1 text-sm text-white/70 font-mono leading-relaxed border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                  <p className="text-white/90 mb-2">{item.description || 'Melhore sua infraestrutura construindo este edifício.'}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span>Custo: <strong className="text-green-400">{formatMoney(item.cost_money)}</strong></span>
                    {item.cost_wood > 0 && <span>Madeira: <strong className="text-orange-400">{formatNumber(item.cost_wood)}</strong></span>}
                    {item.cost_steel > 0 && <span>Aço: <strong className="text-cyan-400">{formatNumber(item.cost_steel)}</strong></span>}
                    {item.energy_cost > 0 && <span>Energia: <strong className="text-red-400">-{item.energy_cost}</strong></span>}
                    {item.profit_money > 0 && <span>Lucro: <strong className="text-green-400">+{formatMoney(item.profit_money)}</strong></span>}
                    {item.produces && <span>Produz: <strong className="text-yellow-400">+{item.produces_qty} {item.produces}</strong></span>}
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}