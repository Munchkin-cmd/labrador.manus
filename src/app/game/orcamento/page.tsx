'use client'

import { useEffect, useState } from 'react'
import { useEco } from '@/hooks/useEco'
import { useAuthStore } from '@/store/authStore'
import { formatMoney, formatNumber } from '@/utils/format'
import { Coins, Sprout, Pickaxe, Factory, Droplet, Landmark, Zap, ArrowRightLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function OrcamentoPage() {
  const { country } = useAuthStore()
  const { economy, buildings, loading } = useEco()

  // ─── BUSCAR IMPOSTOS ────────────────────────────────────────
  const [taxes, setTaxes] = useState<any>(null)
  const [loadingTax, setLoadingTax] = useState(true)

  useEffect(() => {
    async function fetchTaxes() {
      if (!country?.id) return
      const { data } = await supabase
        .from('taxes')
        .select('*')
        .eq('country_id', country.id)
        .maybeSingle()
      setTaxes(data)
      setLoadingTax(false)
    }
    fetchTaxes()
  }, [country?.id])

  if (loading || loadingTax) return <Loading />
  if (!economy || !taxes || !buildings) return null

  // ─── 1. RECEITAS BRUTAS (APENAS Renda, Propriedade e Manufatura) ──
  const incomeTax = Number(taxes.income_tax || 0)
  const propertyTax = Number(taxes.property_tax || 0)
  const manufacturingTax = Number(taxes.manufacturing_tax || 0)

  const grossProfitPerTurn = buildings
    .filter(b => b.is_built && b.is_active)
    .reduce((acc, b) => acc + (Number((b.building_catalog as any)?.profit_money || 0) * Number(b.quantity || 0)), 0)

  const totalRevenue = Number(economy.revenue || 0)
  const taxBase = totalRevenue * 0.15
  const propertyBase = totalRevenue * 0.05

  const turnValues = {
    incomeTax: taxBase * (incomeTax / 100),
    propertyTax: propertyBase * (propertyTax / 100),
    manufacturingTax: taxBase * (manufacturingTax / 100),
    grossProfit: grossProfitPerTurn,
  }

  const totalTurnRevenue = Object.values(turnValues).reduce((a, b) => a + b, 0)

  // ─── 2. DESPESAS BRUTAS ──────────────────────────────────────
  const militaryMaintenance = Number(economy.expenses || 0) * 0.6
  const infraMaintenance = Number(economy.expenses || 0) * 0.4

  const turnExpenses = {
    military: militaryMaintenance,
    infra: infraMaintenance,
  }

  const totalTurnExpenses = Object.values(turnExpenses).reduce((a, b) => a + b, 0)

  // ─── 3. COMÉRCIO EXTERIOR (Balança Comercial) ──────────────
  const exports = Number(economy.exports || 0)
  const imports = Number(economy.imports || 0)
  const tradeBalance = exports - imports

  // ─── 4. RESULTADO LÍQUIDO ────────────────────────────────────
  const netTurn = totalTurnRevenue - totalTurnExpenses

  // ─── 5. BALANÇO DE RECURSOS (Produção vs. Consumo) ──────────
  const resources = {
    food: { label: 'Comida', icon: <Sprout size={16} />, prod: 0, cons: 0 },
    gold: { label: 'Ouro', icon: <Coins size={16} />, prod: 0, cons: 0 },
    iron: { label: 'Ferro', icon: <Pickaxe size={16} />, prod: 0, cons: 0 },
    oil: { label: 'Petróleo', icon: <Droplet size={16} />, prod: 0, cons: 0 },
    wood: { label: 'Madeira', icon: <Landmark size={16} />, prod: 0, cons: 0 },
    uranium: { label: 'Urânio', icon: <Zap size={16} />, prod: 0, cons: 0 },
    coal: { label: 'Carvão', icon: <Factory size={16} />, prod: 0, cons: 0 },
    steel: { label: 'Aço', icon: <ArrowRightLeft size={16} />, prod: 0, cons: 0 },
  }

  let energyProd = 0
  let energyCons = 0

  buildings.filter(b => b.is_built && b.is_active).forEach(b => {
    const cat = b.building_catalog as any
    const qty = Number(b.quantity || 1)

    // ✅ Lê a coluna 'produces' e verifica se é energia ou recurso normal
    if (cat.produces && cat.produces_qty > 0) {
      const resKey = cat.produces.toLowerCase()
      
      if (resKey === 'energy' || resKey === 'energia') {
        energyProd += cat.produces_qty * qty
      } 
      else if (resources[resKey as keyof typeof resources]) {
        resources[resKey as keyof typeof resources].prod += cat.produces_qty * qty
      }
    }

    // ✅ NOVO: Mapeamento de manutenção para TODOS os recursos
    const maintenanceMap: Record<string, keyof typeof resources> = {
      maint_food: 'food',
      maint_gold: 'gold',
      maint_iron: 'iron',
      maint_wood: 'wood',
      maint_uranium: 'uranium',
      maint_steel: 'steel',
      maint_coal: 'coal',
      maint_oil: 'oil',
    }

    Object.entries(maintenanceMap).forEach(([dbField, resKey]) => {
      const cost = Number(cat[dbField] || 0)
      if (cost > 0) {
        resources[resKey].cons += cost * qty
      }
    })

    // ✅ Consumo de energia e custo de energia em óleo/carvão
    if (cat.energy_cost > 0) {
      resources.oil.cons += cat.energy_cost * qty * 0.5
      resources.coal.cons += cat.energy_cost * qty * 0.5
      energyCons += cat.energy_cost * qty
    }

    // ✅ Fallback de segurança para produção de energia antiga
    if (cat.energy_produces > 0) {
      energyProd += cat.energy_produces * qty
    }
  })

  const energyBalance = energyProd - energyCons

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 pb-24 min-h-screen w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6">
      
      {/* TÍTULO PRINCIPAL */}
      <div className="flex items-center gap-2 mb-2 pl-1">
        <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
        <p className="text-xs font-bold tracking-widest text-white uppercase font-mono">Orçamento</p>
      </div>

      {/* ─── RECEITAS BRUTAS ──────────────────────────────────── */}
      <Section title="Receitas Brutas" color="bg-blue-500">
        <TableRow label="Imposto de Renda" value={turnValues.incomeTax} />
        <TableRow label="Imposto sobre Propriedade" value={turnValues.propertyTax} />
        <TableRow label="Manufatura" value={turnValues.manufacturingTax} />
        <TableRow label="Lucro Bruto (Edifícios)" value={turnValues.grossProfit} icon={<Coins size={16} />} />
        <div className="mt-2 border-t border-surface-border pt-2">
          <TableRow label="Total de Receitas" value={totalTurnRevenue} isTotal />
        </div>
      </Section>

      {/* ─── DESPESAS BRUTAS ──────────────────────────────────── */}
      <Section title="Despesas Brutas" color="bg-red-500">
        <TableRow label="Manutenção Militar" value={turnExpenses.military} />
        <TableRow label="Manutenção de Infraestrutura" value={turnExpenses.infra} />
        <div className="mt-2 border-t border-surface-border pt-2">
          <TableRow label="Total de Despesas" value={totalTurnExpenses} isTotal />
        </div>
      </Section>

      {/* ─── COMÉRCIO EXTERIOR ─────────────────────────────────── */}
      <Section title="Comércio Exterior" color="bg-indigo-500">
        <TableRow label="Exportações" value={exports} icon={<ArrowRightLeft size={16} />} />
        <TableRow label="Importações" value={imports} />
        <div className="mt-2 border-t border-surface-border pt-2">
          <TableRow 
            label="Saldo da Balança Comercial" 
            value={tradeBalance} 
            isTotal
            moneyColor={tradeBalance >= 0 ? 'text-green-400' : 'text-red-400'}
          />
        </div>
      </Section>

      {/* ─── RESULTADO LÍQUIDO ────────────────────────────────── */}
      <Section title="Resultado Líquido" color="bg-green-500">
        <TableRow 
          label="Dinheiro" 
          value={netTurn} 
          isTotal 
          moneyColor={netTurn >= 0 ? 'text-green-400' : 'text-red-400'}
        />
      </Section>

      {/* ─── BALANÇO DE RECURSOS (Produção vs. Consumo) ────────── */}
      <Section title="Utilização de Recursos (por turno)" color="bg-purple-500">
        {Object.entries(resources).map(([key, data]) => {
          const balance = data.prod - data.cons
          const isPositive = balance >= 0
          return (
            <div key={key} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-white/70">
                <span className="text-primary/60">{data.icon}</span>
                <span>{data.label}</span>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <span className="text-white/50">PROD: {formatNumber(data.prod)}</span>
                <span className="text-white/30">/</span>
                <span className="text-white/50">CONS: {formatNumber(data.cons)}</span>
                <span className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatNumber(balance)}
                </span>
              </div>
            </div>
          )
        })}

        <div className="flex items-center justify-between py-2 border-surface-border last:border-0 mt-2 pt-2 border-t">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-white/70">
            <span className="text-primary/60"><Zap size={16} /></span>
            <span>Energia</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="text-white/50">PROD: {formatNumber(energyProd)}</span>
            <span className="text-white/30">/</span>
            <span className="text-white/50">CONS: {formatNumber(energyCons)}</span>
            <span className={`font-bold ${energyBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {energyBalance >= 0 ? '+' : ''}{formatNumber(energyBalance)}
            </span>
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children, color }: { title: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="rounded-lg border border-surface-border overflow-hidden bg-surface-card shadow-lg">
      <div className="px-4 py-3 bg-surface-input border-b border-surface-border flex items-center gap-2">
        <div className={`w-1.5 h-3 rounded-full ${color || 'bg-primary'}`} />
        <p className="text-white font-bold text-xs font-mono uppercase tracking-widest">{title}</p>
      </div>
      <div className="p-4 flex flex-col gap-1">{children}</div>
    </div>
  )
}

function TableRow({ label, value, icon, isTotal = false, moneyColor = 'text-white' }: { label: string; value: number; icon?: React.ReactNode; isTotal?: boolean; moneyColor?: string }) {
  return (
    <div className={`flex items-center justify-between py-2 ${isTotal ? 'bg-surface-input -mx-2 px-2 rounded-md mt-1 border border-surface-border' : 'border-b border-surface-border last:border-0'}`}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-primary/60">{icon}</span>}
        <span className={`text-[11px] font-mono uppercase tracking-wider ${isTotal ? 'text-white font-bold' : 'text-white/60'}`}>
          {label}
        </span>
      </div>
      <div className={`flex items-center gap-4 text-xs font-mono ${moneyColor}`}>
        <span className={isTotal ? 'font-bold text-sm' : ''}>{formatMoney(value)}</span>
      </div>
    </div>
  )
}

function Loading() {
  return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
}