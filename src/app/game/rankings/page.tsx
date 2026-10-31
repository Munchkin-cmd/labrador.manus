'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Trophy, ArrowLeft, List, BarChart3, LineChart as LineChartIcon, RefreshCw } from 'lucide-react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend 
} from 'recharts'

// ─── TIPOS ──────────────────────────────────────────────
type RankingType = {
  country_id: number
  name: string
  flag_emoji: string
  slug: string | null
  value: number
  formattedValue: string
}

type SelectOption = {
  group: string
  label: string
  value: string
}

// ─── CONFIGURAÇÃO VISUAL DOS GRUPOS ─────────────────────
const GROUP_COLORS: Record<string, string> = {
  '📊 Indicadores': 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
  '💰 Economia': 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20',
  '🏙️ Edifícios e Regiões': 'border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20',
  '📈 Taxas': 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20',
  '⚔️ Militar': 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20',
  '📰 Artigos': 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20',
  '📦 Estoque de Recursos': 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20',
  '🏭 Produção de Recursos': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
  '🔻 Consumo de Recursos': 'border-pink-500/30 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20',
}

// ✅ FUNÇÃO DE FORMATAÇÃO LOCAL COM 3 CASAS DECIMAIS
const formatRankingValue = (value: number, isMoney: boolean = false) => {
  const suffixes = [
    { value: 1e33, symbol: 'D' }, { value: 1e30, symbol: 'N' }, { value: 1e27, symbol: 'O' },
    { value: 1e24, symbol: 'Sp' }, { value: 1e21, symbol: 'Sx' }, { value: 1e18, symbol: 'Qi' },
    { value: 1e15, symbol: 'Q' }, { value: 1e12, symbol: 'T' }, { value: 1e9, symbol: 'B' },
    { value: 1e6, symbol: 'M' }, { value: 1e3, symbol: 'K' }
  ]
  const tier = suffixes.find(t => Math.abs(value) >= t.value)
  const prefix = isMoney ? '$' : ''
  
  if (tier) {
    return `${prefix}${(value / tier.value).toFixed(3)}${tier.symbol}`
  }
  return `${prefix}${value.toFixed(0)}`
}

export default function RankingsPage() {
  const [loading, setLoading] = useState(true)
  const [rawData, setRawData] = useState<any>({
    countries: [], economies: [], militaries: [], buildings: [], catalog: [], 
    regions: [], taxes: []
  })
  
  // Estados de UI
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list')
  const [activeGroup, setActiveGroup] = useState<string>('📊 Indicadores')
  const [selectedMetric, setSelectedMetric] = useState<string>('idh')
  const [rankings, setRankings] = useState<RankingType[]>([])
  
  // Estados do Gráfico
  const [compareCountryA, setCompareCountryA] = useState<number | ''>('')
  const [compareCountryB, setCompareCountryB] = useState<number | ''>('')

  // ─── OPÇÕES DO MENU ──────────────────────────────────────
  const options: SelectOption[] = [
    { group: '📊 Indicadores', label: 'IDH', value: 'idh' },
    { group: '📊 Indicadores', label: 'Cresc. Populacional', value: 'population_growth' },
    { group: '📊 Indicadores', label: 'Inflação', value: 'inflation' },
    { group: '📊 Indicadores', label: 'População', value: 'population' },
    
    { group: '💰 Economia', label: 'Dinheiro', value: 'money' },
    { group: '💰 Economia', label: 'Receitas', value: 'revenue' },
    { group: '💰 Economia', label: 'Despesas Totais', value: 'expenses' },
    { group: '💰 Economia', label: 'Exportação', value: 'exports' },
    { group: '💰 Economia', label: 'Importação', value: 'imports' },
    { group: '💰 Economia', label: 'Lucro Bruto', value: 'gross_profit' },
    // ✅ NOVAS OPÇÕES DE MANUTENÇÃO
    { group: '💰 Economia', label: 'Manut. de Infraestrutura', value: 'infra_maintenance' },
    { group: '💰 Economia', label: 'Manut. Militar (Est.)', value: 'military_maintenance' },
    
    { group: '🏙️ Edifícios e Regiões', label: 'Total de Edifícios', value: 'total_buildings' },
    { group: '🏙️ Edifícios e Regiões', label: 'Total de Regiões', value: 'total_regions' },
    
    { group: '📈 Taxas', label: 'Imposto de Renda (%)', value: 'tax_income' },
    { group: '📈 Taxas', label: 'Imposto Propriedade (%)', value: 'tax_property' },
    { group: '📈 Taxas', label: 'Imposto Manufatura (%)', value: 'tax_manufacturing' },

    { group: '⚔️ Militar', label: 'Soldados', value: 'soldiers' },
    { group: '⚔️ Militar', label: 'Tanques', value: 'tanks' },
    { group: '⚔️ Militar', label: 'Aeronaves', value: 'aircraft' },
    { group: '⚔️ Militar', label: 'Artilharia', value: 'artillery' },
    { group: '⚔️ Militar', label: 'Helicópteros', value: 'helicopters' },
    { group: '⚔️ Militar', label: 'Drones', value: 'drones' },
    { group: '⚔️ Militar', label: 'Mísseis', value: 'missiles' },
    { group: '⚔️ Militar', label: 'Ogivas', value: 'warheads' },
    { group: '⚔️ Militar', label: 'Munição', value: 'ammunition' },

    { group: '📰 Artigos', label: 'Total de Artigos', value: 'total_articles' },
    { group: '📰 Artigos', label: 'Mais Votos (Likes)', value: 'total_likes' },
  ]

  const resources = [
    { key: 'food', label: 'Comida' }, { key: 'gold', label: 'Ouro' }, { key: 'iron', label: 'Ferro' },
    { key: 'oil', label: 'Petróleo' }, { key: 'wood', label: 'Madeira' }, { key: 'uranium', label: 'Urânio' },
    { key: 'coal', label: 'Carvão' }, { key: 'steel', label: 'Aço' }, { key: 'energy', label: 'Energia' },
  ]

  resources.forEach(res => {
    options.push({ group: `📦 Estoque de Recursos`, label: `Estoque de ${res.label}`, value: `stock_${res.key}` })
    options.push({ group: `🏭 Produção de Recursos`, label: `Produção de ${res.label}`, value: `prod_${res.key}` })
    options.push({ group: `🔻 Consumo de Recursos`, label: `Consumo de ${res.label}`, value: `cons_${res.key}` })
  })

  // Agrupa os filtros
  const groupedOptions = options.reduce((acc, opt) => {
    if (!acc[opt.group]) acc[opt.group] = []
    acc[opt.group].push(opt)
    return acc
  }, {} as Record<string, SelectOption[]>)

  // ─── BUSCAR DADOS (MANUAL E INICIAL) ───────────────────
  const fetchAllData = useCallback(async () => {
    setLoading(true)
    
    const [
      { data: countries }, { data: economies }, { data: militaries },
      { data: buildings }, { data: catalog }, { data: regions },
      { data: articles }, { data: taxes }
    ] = await Promise.all([
      supabase.from('countries').select('id, name, flag_emoji, slug'),
      supabase.from('economy').select('*'),
      supabase.from('military').select('*'),
      supabase.from('buildings').select('country_id, building_type, quantity'),
      supabase.from('building_catalog').select('type, profit_money, produces, produces_qty, maint_food, maint_gold, maint_iron, maint_oil, maint_wood, maint_uranium, maint_coal, maint_steel, maint_money, energy_cost'),
      supabase.from('regions').select('country_id'),
      supabase.from('articles').select('country_id, likes'),
      supabase.from('taxes').select('country_id, income_tax, property_tax, manufacturing_tax')
    ])

    setRawData({
      countries: countries || [], economies: economies || [], militaries: militaries || [],
      buildings: buildings || [], catalog: catalog || [], regions: regions || [],
      articles: articles || [], taxes: taxes || []
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // ─── CALCULAR RANKING ───────────────────────────────────
  useEffect(() => {
    if (loading || rawData.countries.length === 0) return

    const { countries, economies, militaries, buildings, catalog, regions, articles, taxes } = rawData

    const calculated = countries.map((c: any) => {
      const eco = economies.find((e: any) => Number(e.country_id) === Number(c.id)) || {}
      const mil = militaries.find((m: any) => Number(m.country_id) === Number(c.id)) || {}
      const tax = taxes.find((t: any) => Number(t.country_id) === Number(c.id)) || {}
      
      const cBuildings = buildings.filter((b: any) => Number(b.country_id) === Number(c.id))
      const cRegions = regions.filter((r: any) => Number(r.country_id) === Number(c.id))
      
      const cArticles = articles.filter((a: any) => Number(a.country_id) === Number(c.id))
      const total_articles = cArticles.length
      const total_likes = cArticles.reduce((acc: number, a: any) => acc + (a.likes || 0), 0)

      let prod: any = { food: 0, gold: 0, iron: 0, oil: 0, wood: 0, uranium: 0, coal: 0, steel: 0, energy: 0 }
      let cons: any = { food: 0, gold: 0, iron: 0, oil: 0, wood: 0, uranium: 0, coal: 0, steel: 0, energy: 0 }
      let gross_profit = 0
      let total_buildings = 0
      let infra_maintenance = 0 // ✅ Nova variável

      cBuildings.forEach((b: any) => {
        const cat = catalog.find((k: any) => k.type === b.building_type)
        if (!cat) return
        const qty = Number(b.quantity || 1)
        total_buildings += qty
        gross_profit += (cat.profit_money || 0) * qty
        infra_maintenance += (cat.maint_money || 0) * qty // ✅ Soma a manutenção de dinheiro do prédio

        if (cat.produces && cat.produces_qty > 0) {
          const resKey = cat.produces.toLowerCase()
          if (prod[resKey] !== undefined) prod[resKey] += cat.produces_qty * qty
        }
        
        if (cat.energy_cost > 0) {
          cons.energy += cat.energy_cost * qty
          cons.oil += cat.energy_cost * qty * 0.5
          cons.coal += cat.energy_cost * qty * 0.5
        }
        
        ;['food','gold','iron','oil','wood','uranium','coal','steel'].forEach(res => {
          if (cat[`maint_${res}`] > 0) cons[res] += cat[`maint_${res}`] * qty
        })
      })

      // ✅ Estimativa de Manutenção Militar (já que o banco não cobra ainda)
      // Exemplo: Cada soldado custa $10 de manutenção. Sinta-se livre para mudar o multiplicador.
      const military_maintenance = (Number(mil.soldiers) || 0) * 10

      const merged: any = { 
        ...c, ...eco, ...mil, ...tax,
        total_articles, total_likes, total_buildings, total_regions: cRegions.length, gross_profit,
        infra_maintenance, military_maintenance // Adiciona ao objeto
      }

      resources.forEach(r => {
        merged[`stock_${r.key}`] = Number(eco[r.key] || 0)
        merged[`prod_${r.key}`] = prod[r.key] || 0
        merged[`cons_${r.key}`] = cons[r.key] || 0
      })

      return merged
    })

    const sorted: RankingType[] = calculated.map((c: any) => {
      let val = Number(c[selectedMetric] || 0)
      let formatted = formatRankingValue(val)

      // Formata como dinheiro se for algum desses
      if (['money', 'revenue', 'expenses', 'exports', 'imports', 'gross_profit', 'infra_maintenance', 'military_maintenance'].includes(selectedMetric)) {
        formatted = formatRankingValue(val, true)
      } else if (selectedMetric === 'population') {
        formatted = `${formatRankingValue(val)} hab`
      } else if (['idh'].includes(selectedMetric)) {
        formatted = val.toFixed(3)
      } else if (['inflation', 'population_growth', 'tax_income', 'tax_property', 'tax_manufacturing'].includes(selectedMetric)) {
        formatted = `${val.toFixed(1)}%`
      }

      return {
        country_id: c.id, name: c.name, flag_emoji: c.flag_emoji, slug: c.slug,
        value: val, formattedValue: formatted
      }
    })
    
    sorted.sort((a: RankingType, b: RankingType) => b.value - a.value)
    setRankings(sorted)

  }, [selectedMetric, rawData, loading])

  // ─── PREPARAR DADOS DO GRÁFICO ───────────────────────────
  const lineChartData = rankings.slice(0, 10).map(r => ({
    name: r.name,
    value: r.value,
  }))

  const radarData = [
    { subject: 'Economia', A: 0, B: 0 },
    { subject: 'Militar', A: 0, B: 0 },
    { subject: 'Edifícios', A: 0, B: 0 },
    { subject: 'População', A: 0, B: 0 },
    { subject: 'IDH', A: 0, B: 0 },
  ]

  if (compareCountryA && compareCountryB) {
    const cA = rawData.countries.find((c: any) => Number(c.id) === Number(compareCountryA))
    const cB = rawData.countries.find((c: any) => Number(c.id) === Number(compareCountryB))
    
    if (cA && cB) {
      const getA = rawData.economies.find((e: any) => Number(e.country_id) === Number(cA.id)) || {}
      const getAMil = rawData.militaries.find((m: any) => Number(m.country_id) === Number(cA.id)) || {}
      const getABld = rawData.buildings.filter((b: any) => Number(b.country_id) === Number(cA.id)).length
      
      const getB = rawData.economies.find((e: any) => Number(e.country_id) === Number(cB.id)) || {}
      const getBMil = rawData.militaries.find((m: any) => Number(m.country_id) === Number(cB.id)) || {}
      const getBBld = rawData.buildings.filter((b: any) => Number(b.country_id) === Number(cB.id)).length
      
      radarData[0].A = (getA.money || 0) / 1e12
      radarData[1].A = (getAMil.soldiers || 0) / 1e6
      radarData[2].A = getABld
      radarData[3].A = (getA.population || 0) / 1e9
      radarData[4].A = (getA.idh || 0) * 100

      radarData[0].B = (getB.money || 0) / 1e12
      radarData[1].B = (getBMil.soldiers || 0) / 1e6
      radarData[2].B = getBBld
      radarData[3].B = (getB.population || 0) / 1e9
      radarData[4].B = (getB.idh || 0) * 100
    }
  }

  // ─── RENDER ──────────────────────────────────────────────
  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>

  return (
    // ✅ pt-20 (80px) garante que o conteúdo comece abaixo do Header fixo
    <div className="max-w-5xl mx-auto pb-24 px-4 sm:px-6 pt-20">
      
      {/* HEADER E TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/game/home" className="text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="text-yellow-400" /> Rankings
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchAllData} 
            className="px-4 py-2 flex items-center gap-2 bg-surface-card border border-surface-border hover:bg-surface-input rounded-lg text-xs font-bold text-white/70 hover:text-white transition-colors shadow-lg" 
            title="Atualizar Dados"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
          
          <div className="flex bg-surface-card border border-surface-border rounded-lg p-1 shadow-inner">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-white/50 hover:text-white'}`}
            >
              <List size={16} /> Lista
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === 'chart' ? 'bg-primary text-white' : 'text-white/50 hover:text-white'}`}
            >
              <BarChart3 size={16} /> Gráfico
            </button>
          </div>
        </div>
      </div>

      {/* QUADRADOS DE FILTRO (GRUPO) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
        {Object.keys(groupedOptions).map(group => (
          <button
            key={group}
            onClick={() => setActiveGroup(group)}
            className={`border rounded-xl p-3 text-[10px] font-bold font-mono uppercase tracking-widest transition-all ${
              activeGroup === group 
                ? 'ring-2 ring-primary shadow-[0_0_15px_rgba(59,130,246,0.3)] opacity-100' 
                : 'opacity-60 hover:opacity-100'
            } ${GROUP_COLORS[group] || 'bg-surface-card border-surface-border text-white'}`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* QUADRADOS DE FILTRO (MÉTRICA ESPECÍFICA) */}
      {activeGroup && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 mb-6 shadow-lg">
          <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest mb-3">Selecione a métrica</p>
          <div className="flex flex-wrap gap-2">
            {groupedOptions[activeGroup].map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedMetric(opt.value)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${
                  selectedMetric === opt.value
                    ? 'bg-primary border-primary text-white shadow-md'
                    : 'bg-black/30 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── VISÃO DE LISTA ─────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden shadow-2xl animate-in fade-in">
          <div className="grid grid-cols-[50px_1fr_100px] sm:grid-cols-[60px_1fr_150px] gap-2 px-4 py-3 bg-surface-input border-b border-surface-border font-bold text-[10px] text-white/50 uppercase tracking-widest">
            <div className="text-center">Pos</div>
            <div>País</div>
            <div className="text-right">Valor</div>
          </div>
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            {rankings.map((r, idx) => {
              let medal = null;
              if (idx === 0) medal = <span className="text-xl">🥇</span>;
              else if (idx === 1) medal = <span className="text-xl">🥈</span>;
              else if (idx === 2) medal = <span className="text-xl">🥉</span>;
              else medal = <span className="text-white/40 font-mono text-sm">{idx + 1}º</span>;

              return (
                <div key={r.country_id} className="grid grid-cols-[50px_1fr_100px] sm:grid-cols-[60px_1fr_150px] gap-2 px-4 py-3 items-center border-b border-surface-border last:border-0 hover:bg-white/5 transition-colors group">
                  <div className="flex justify-center">{medal}</div>
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xl shrink-0">{r.flag_emoji}</span>
                    <Link href={`/game/pais/${r.slug || r.country_id}`} className="text-white font-semibold text-sm truncate hover:text-primary transition-colors">
                      {r.name}
                    </Link>
                  </div>
                  <div className="text-right font-bold font-mono text-sm text-primary">
                    {r.formattedValue}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── VISÃO DE GRÁFICO ───────────────────────────────── */}
      {viewMode === 'chart' && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 sm:p-6 shadow-2xl animate-in fade-in">
          
          {/* Gráfico de Linha (Normal) */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-primary"/> Top 10 - {options.find(o => o.value === selectedMetric)?.label}
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A4A" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" tick={{ fill: '#64748B', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                  
                  <YAxis stroke="#64748B" tick={{ fill: '#64748B', fontSize: 10 }} tickFormatter={(val: any) => formatRankingValue(Number(val))} />
                  
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1A1A2E', borderColor: '#2A2A4A', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => [formatRankingValue(Number(value)), 'Valor']}
                  />
                  
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3B82F6" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }} 
                    activeDot={{ r: 8, fill: '#60A5FA' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparação Direta (Radar) */}
          <div className="border-t border-surface-border pt-6 mt-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <LineChartIcon size={16} className="text-emerald-400"/> Comparar Países
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[10px] text-white/50 font-mono uppercase mb-1 block">País A</label>
                <select value={compareCountryA} onChange={(e) => setCompareCountryA(Number(e.target.value))} className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-2 rounded-lg">
                  <option value="">Selecione...</option>
                  {rawData.countries.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/50 font-mono uppercase mb-1 block">País B</label>
                <select value={compareCountryB} onChange={(e) => setCompareCountryB(Number(e.target.value))} className="w-full bg-[#0a0a0a] border border-white/10 text-white px-4 py-2 rounded-lg">
                  <option value="">Selecione...</option>
                  {rawData.countries.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {compareCountryA && compareCountryB && (
              <div className="h-[350px] w-full bg-black/20 rounded-xl p-2 border border-white/5">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#2A2A4A" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Radar name={rawData.countries.find((c:any)=>Number(c.id)===Number(compareCountryA))?.name} dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.5} />
                    <Radar name={rawData.countries.find((c:any)=>Number(c.id)===Number(compareCountryB))?.name} dataKey="B" stroke="#10B981" fill="#10B981" fillOpacity={0.5} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1A1A2E', borderColor: '#2A2A4A', borderRadius: '8px' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  )
}