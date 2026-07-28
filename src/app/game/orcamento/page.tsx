'use client'

import { useEffect, useState } from 'react'
import { useEconomy } from '@/hooks/useMenu'
import { useRede } from '@/hooks/useEco'
import { useAuthStore } from '@/store/authStore'
import { formatMoney, formatNumber } from '@/utils/format'
import { Coins, Sprout, Pickaxe, Factory, Droplet, Landmark, Zap, ArrowRightLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function OrcamentoPage() {
  const { country } = useAuthStore()
  const { economy, loading: loadingEco } = useEconomy()
  const { buildings, loading: loadingRede } = useRede()
  
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
        .single()
      setTaxes(data)
      setLoadingTax(false)
    }
    fetchTaxes()
  }, [country?.id])

  if (loadingEco || loadingRede || loadingTax) return <Loading />
  if (!economy || !taxes || !buildings) return null

  // ─── 1. RECEITAS BRUTAS ──────────────────────────────────────
  const incomeTax = Number(taxes.income_tax || 0)
  const corporateTax = Number(taxes.corporate_tax || 0)
  const propertyTax = Number(taxes.property_tax || 0)
  const manufacturingTax = Number(taxes.manufacturing_tax || 0)
  const vat = Number(taxes.vat || 0)
  const customs = Number(taxes.customs || 0)

  const grossProfitPerTurn = buildings
    .filter(b => b.is_built && b.is_active)
    .reduce((acc, b) => acc + (Number((b.building_catalog as any)?.profit_money || 0) * Number(b.quantity || 0)), 0)

  const totalRevenue = Number(economy.revenue || 0)
  const taxBase = totalRevenue * 0.15
  const propertyBase = totalRevenue * 0.05

  const turnValues = {
    incomeTax: taxBase * (incomeTax / 100),
    corporateTax: taxBase * (corporateTax / 100),
    propertyTax: propertyBase * (propertyTax / 100),
    manufacturingTax: taxBase * (manufacturingTax / 100),
    vat: taxBase * (vat / 100),
    customs: taxBase * (customs / 100),
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
    comida: { icon: <Sprout size={16} />, prod: 0, cons: 0 },
    ouro: { icon: <Coins size={16} />, prod: 0, cons: 0 },
    ferro: { icon: <Pickaxe size={16} />, prod: 0, cons: 0 },
    petroleo: { icon: <Droplet size={16} />, prod: 0, cons: 0 },
    madeira: { icon: <Landmark size={16} />, prod: 0, cons: 0 },
    uranio: { icon: <Zap size={16} />, prod: 0, cons: 0 },
    carvao: { icon: <Factory size={16} />, prod: 0, cons: 0 },
    aco: { icon: <ArrowRightLeft size={16} />, prod: 0, cons: 0 },
  }

  let energyProd = 0
  let energyCons = 0

  buildings.filter(b => b.is_built && b.is_active).forEach(b => {
    const cat = b.building_catalog as any
    const qty = Number(b.quantity || 1)
    
    if (cat.produces && cat.produces_qty > 0) {
      const resKey = cat.produces as keyof typeof resources
      if (resources[resKey]) {
        resources[resKey].prod += cat.produces_qty * qty
      }
    }

    if (cat.energy_cost > 0) {
      resources.petroleo.cons += cat.energy_cost * qty * 0.5
      resources.carvao.cons += cat.energy_cost * qty * 0.5
    }

    if (cat.energy_produces > 0) {
      energyProd += cat.energy_produces * qty
    }
    if (cat.energy_cost > 0) {
      energyCons += cat.energy_cost * qty
    }
  })

  const energyBalance = energyProd - energyCons

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 pb-6 p-4">
      <p className="text-xs font-bold tracking-widest text-white/40 uppercase">ORÇAMENTO</p>

      {/* ─── RECEITAS BRUTAS ──────────────────────────────────── */}
      <Section title="Receitas Brutas" color="bg-blue-900/60">
        <TableRow label="Imposto de Renda" value={turnValues.incomeTax} />
        <TableRow label="Imposto Corporativo" value={turnValues.corporateTax} />
        <TableRow label="Imposto sobre Propriedade" value={turnValues.propertyTax} />
        <TableRow label="Manufatura Avançada" value={turnValues.manufacturingTax} />
        <TableRow label="IVA (Imposto sobre Valor)" value={turnValues.vat} />
        <TableRow label="Alfândega (Customs)" value={turnValues.customs} />
        <TableRow label="Lucro Bruto (Edifícios)" value={turnValues.grossProfit} icon={<Coins size={16} />} />
        <div className="mt-2 border-t border-white/10 pt-2">
          <TableRow label="Total de Receitas" value={totalTurnRevenue} isTotal />
        </div>
      </Section>

      {/* ─── DESPESAS BRUTAS ──────────────────────────────────── */}
      <Section title="Despesas Brutas" color="bg-red-900/60">
        <TableRow label="Manutenção Militar" value={turnExpenses.military} />
        <TableRow label="Manutenção de Infraestrutura" value={turnExpenses.infra} />
        <div className="mt-2 border-t border-white/10 pt-2">
          <TableRow label="Total de Despesas" value={totalTurnExpenses} isTotal />
        </div>
      </Section>

      {/* ─── COMÉRCIO EXTERIOR ─────────────────────────────────── */}
      <Section title="Comércio Exterior" color="bg-indigo-900/60">
        <TableRow label="Exportações" value={exports} icon={<ArrowRightLeft size={16} />} />
        <TableRow label="Importações" value={imports} />
        <div className="mt-2 border-t border-white/10 pt-2">
          <TableRow 
            label="Saldo da Balança Comercial" 
            value={tradeBalance} 
            isTotal
            moneyColor={tradeBalance >= 0 ? 'text-green-400' : 'text-red-400'}
          />
        </div>
      </Section>

      {/* ─── RESULTADO LÍQUIDO ────────────────────────────────── */}
      <Section title="Resultado Líquido" color="bg-green-900/60">
        <TableRow 
          label="Dinheiro" 
          value={netTurn} 
          isTotal 
          moneyColor={netTurn >= 0 ? 'text-green-400' : 'text-red-400'}
        />
      </Section>

      {/* ─── BALANÇO DE RECURSOS (Produção vs. Consumo) ────────── */}
      <Section title="Utilização de Recursos (por turno)" color="bg-purple-900/60">
        {Object.entries(resources).map(([key, data]) => {
          const balance = data.prod - data.cons
          const isPositive = balance >= 0
          return (
            <div key={key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2 text-sm text-white/70">
                {data.icon}
                <span className="capitalize">{key}</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-white/50">Prod: {formatNumber(data.prod)}</span>
                <span className="text-white/30">/</span>
                <span className="text-white/50">Cons: {formatNumber(data.cons)}</span>
                <span className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatNumber(balance)}
                </span>
              </div>
            </div>
          )
        })}

        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Zap size={16} />
            <span>Energia</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-white/50">Prod: {formatNumber(energyProd)}</span>
            <span className="text-white/30">/</span>
            <span className="text-white/50">Cons: {formatNumber(energyCons)}</span>
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
    <div className={`rounded-xl border border-white/10 overflow-hidden ${color || 'bg-white/5'}`}>
      <div className={`px-4 py-2 ${color || 'bg-white/5'}`}>
        <p className="text-white font-semibold text-sm tracking-wide">{title}</p>
      </div>
      <div className="bg-surface-card p-4 flex flex-col gap-1">{children}</div>
    </div>
  )
}

function TableRow({ label, value, icon, isTotal = false, moneyColor = 'text-white' }: { label: string; value: number; icon?: React.ReactNode; isTotal?: boolean; moneyColor?: string }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${isTotal ? 'bg-white/5 -mx-2 px-2 rounded-lg mt-1' : 'border-b border-white/5'}`}>
      <div className="flex items-center gap-2 text-sm">
        {icon && <span className="text-white/40">{icon}</span>}
        <span className={isTotal ? 'text-white font-bold' : 'text-white/60'}>{label}</span>
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