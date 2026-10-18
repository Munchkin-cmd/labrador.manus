'use client'

import { useState } from 'react'
import { useMarket } from '@/hooks/useMenu'
import { formatMoney, formatNumber } from '@/utils/format'
import { supabase } from '@/lib/supabase/client'

// ─── ITENS COMERCIAIS (recursos + equipamentos) ──────────
const TRADE_ITEMS = [
  // Recursos
  { id: 'gold',    label: 'Ouro',    emoji: '🪙', category: 'resource' },
  { id: 'iron',    label: 'Ferro',   emoji: '🪨', category: 'resource' },
  { id: 'oil',     label: 'Petróleo',emoji: '🛢️', category: 'resource' },
  { id: 'food',    label: 'Comida',  emoji: '🌾', category: 'resource' },
  { id: 'wood',    label: 'Madeira', emoji: '🪵', category: 'resource' },
  { id: 'uranium', label: 'Urânio',  emoji: '☢️', category: 'resource' },
  { id: 'coal',    label: 'Carvão',  emoji: '⛏️', category: 'resource' },
  { id: 'steel',   label: 'Aço',     emoji: '⚙️', category: 'resource' },
  // Equipamentos militares
  { id: 'soldiers',   label: 'Soldados',   emoji: '⚔️', category: 'military' },
  { id: 'tanks',      label: 'Tanques',    emoji: '🛡️', category: 'military' },
  { id: 'artillery',  label: 'Artilharia', emoji: '💣', category: 'military' },
  { id: 'aircraft',   label: 'Aeronaves',  emoji: '✈️', category: 'military' },
  { id: 'helicopters',label: 'Helicópteros',emoji: '🚁', category: 'military' },
  { id: 'drones',     label: 'Drones',     emoji: '🤖', category: 'military' },
  { id: 'missiles',   label: 'Mísseis',    emoji: '🎯', category: 'military' },
  { id: 'warheads',   label: 'Ogivas',     emoji: '☢️', category: 'military' },
]

const ITEM_EMOJI: Record<string, string> = Object.fromEntries(
  TRADE_ITEMS.map(item => [item.id, item.emoji])
)

export default function MercadoPage() {
  const { offers, myOffers, loading, placeOrder, buyOffer, cancelOrder, refetch } = useMarket()
  const [tab, setTab] = useState<'comprar' | 'minhas'>('comprar')
  const [filterItem, setFilterItem] = useState('')
  const [filterCategory, setFilterCategory] = useState<'all' | 'resource' | 'military'>('all')
  const [newItem, setNewItem] = useState('gold')
  const [newQty, setNewQty] = useState(100)
  const [newPrice, setNewPrice] = useState(1000)
  const [buyQtys, setBuyQtys] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState('')
  const [submitting, setSub] = useState(false)

  // ─── FILTROS ──────────────────────────────────────────────
  const filtered = offers.filter(o => {
    if (filterItem && o.resource_type !== filterItem) return false
    if (filterCategory !== 'all') {
      const item = TRADE_ITEMS.find(i => i.id === o.resource_type)
      if (!item || item.category !== filterCategory) return false
    }
    return true
  })

  // ─── CRIAR OFERTA DE VENDA ──────────────────────────────
  async function handlePlace() {
    setSub(true)
    setFeedback('')
    const res = await placeOrder(newItem, 'sell', newQty, newPrice) // forçando 'sell'
    setFeedback(
      typeof res === 'object' && res !== null
        ? (res as any)?.message ?? (res as any)?.error ?? 'Erro'
        : 'Erro'
    )
    setSub(false)
  }

  // ─── COMPRAR OFERTA ──────────────────────────────────────
  async function handleBuy(orderId: string) {
    const qty = buyQtys[orderId] ?? 1
    setSub(true)
    setFeedback('')
    const res = await buyOffer(orderId, qty)
    setFeedback((res as any)?.success ? '✅ Compra realizada!' : (res as any)?.error ?? 'Erro')
    setSub(false)
  }

  // ─── CANCELAR OFERTA ─────────────────────────────────────
  async function handleCancel(orderId: string) {
    if (!confirm('Tem certeza que deseja cancelar esta oferta?')) return
    setSub(true)
    setFeedback('')
    const res = await cancelOrder(orderId)
    if (res.success) {
      setFeedback('✅ Oferta cancelada com sucesso!')
      refetch()
    } else {
      setFeedback('❌ ' + (res.error || 'Erro ao cancelar'))
    }
    setSub(false)
  }

  if (loading) return <Loading />

  return (
    <div className="flex flex-col gap-4 pb-24 min-h-screen w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6">

      {/* ─── TABS ───────────────────────────────────────────── */}
      <div className="flex border-b border-surface-border mb-2">
        <button
          onClick={() => setTab('comprar')}
          className={`flex-1 py-3 text-[11px] font-bold font-mono uppercase tracking-widest transition-colors
            ${tab === 'comprar' ? 'text-primary border-b-2 border-primary' : 'text-white/40 hover:text-white/70'}`}
        >
          🛒 Comprar
        </button>
        <button
          onClick={() => setTab('minhas')}
          className={`flex-1 py-3 text-[11px] font-bold font-mono uppercase tracking-widest transition-colors
            ${tab === 'minhas' ? 'text-primary border-b-2 border-primary' : 'text-white/40 hover:text-white/70'}`}
        >
          📋 Minhas Ofertas
        </button>
      </div>

      {tab === 'comprar' && (
        <div className="flex flex-col gap-4">

          {/* ─── FILTROS ─────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as any)}
              className="input-field flex-1 min-w-[120px] text-sm bg-surface-input"
            >
              <option value="all">Todos os itens</option>
              <option value="resource">📦 Recursos</option>
              <option value="military">⚔️ Equipamentos</option>
            </select>
            <select
              value={filterItem}
              onChange={e => setFilterItem(e.target.value)}
              className="input-field flex-1 min-w-[120px] text-sm bg-surface-input"
            >
              <option value="">Todos</option>
              {TRADE_ITEMS
                .filter(i => filterCategory === 'all' || i.category === filterCategory)
                .map(item => (
                  <option key={item.id} value={item.id}>
                    {item.emoji} {item.label}
                  </option>
                ))}
            </select>
          </div>

          {feedback && (
            <p className={`text-xs font-mono px-4 py-3 rounded-lg border ${
              feedback.includes('✅') ? 'text-green-400 bg-green-500/10 border-green-500/20' :
              feedback.includes('❌') ? 'text-red-400 bg-red-500/10 border-red-500/20' :
              'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
            }`}>
              {feedback}
            </p>
          )}

          {/* ─── LISTA DE OFERTAS GLOBAIS ───────────────────── */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-surface-card border border-surface-border rounded-xl mt-2">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-white/40 text-xs font-mono uppercase tracking-widest">Nenhuma oferta de venda disponível</p>
            </div>
          ) : (
            filtered.map(offer => {
              const item = TRADE_ITEMS.find(i => i.id === offer.resource_type)
              const qty = buyQtys[offer.id] ?? 1
              const total = offer.price_per_unit * qty
              return (
                <div key={offer.id} className="bg-surface-card border border-surface-border rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl drop-shadow-md">{(offer.countries as any)?.flag_emoji ?? '🌐'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold uppercase tracking-wider truncate">{(offer.countries as any)?.name}</p>
                      <p className="text-primary/70 text-[10px] font-mono mt-0.5 uppercase tracking-widest">
                        {item?.emoji} {item?.label || offer.resource_type}
                        {item?.category === 'military' && ' ⚔️'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-primary font-bold text-sm font-mono">{formatMoney(offer.price_per_unit)}/un</p>
                      <p className="text-white/40 text-[10px] font-mono mt-0.5">DISP: {formatNumber(offer.available_qty)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 border-t border-surface-border pt-3">
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={offer.available_qty}
                        value={qty}
                        onChange={e => setBuyQtys(prev => ({ ...prev, [offer.id]: Number(e.target.value) }))}
                        className="input-field w-20 py-2 text-sm bg-surface-input text-center font-mono"
                        placeholder="Qtd"
                      />
                      <span className="text-white/60 text-[10px] font-mono">
                        = {formatMoney(total)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleBuy(offer.id)}
                      disabled={submitting}
                      className="bg-primary hover:bg-primary-dark disabled:opacity-30 text-white font-bold px-5 py-2 rounded-lg text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-primary/20"
                    >
                      Comprar
                    </button>
                  </div>
                </div>
              )
            })
          )}

          {/* ─── CRIAR OFERTA DE VENDA ────────────────────── */}
          <div className="mt-4 pt-6 border-t border-surface-border">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <p className="text-xs font-bold tracking-widest text-white uppercase font-mono">
                Criar Oferta de Venda
              </p>
            </div>
            
            <div className="bg-surface-card border border-surface-border rounded-xl p-4 sm:p-5 shadow-lg flex flex-col gap-3">
              <div className="flex gap-2">
                <select
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  className="input-field flex-1 text-sm bg-surface-input"
                >
                  {TRADE_ITEMS.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.emoji} {item.label} {item.category === 'military' ? '(⚔️)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-white/50 text-[10px] font-mono uppercase tracking-widest block mb-1">Quantidade</label>
                  <input
                    type="number"
                    value={newQty}
                    onChange={e => setNewQty(Number(e.target.value))}
                    className="input-field w-full text-sm bg-surface-input font-mono"
                    min={1}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-white/50 text-[10px] font-mono uppercase tracking-widest block mb-1">Preço Unitário (R$)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={e => setNewPrice(Number(e.target.value))}
                    className="input-field w-full text-sm bg-surface-input font-mono"
                    min={1}
                  />
                </div>
                <div className="flex items-end sm:w-32">
                  <button
                    onClick={handlePlace}
                    disabled={submitting}
                    className="w-full bg-primary hover:bg-primary-dark disabled:opacity-30 text-white font-bold py-2.5 rounded-lg text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-primary/20 h-[42px]"
                  >
                    {submitting ? '...' : 'Publicar'}
                  </button>
                </div>
              </div>
              
              {newQty > 0 && newPrice > 0 && (
                <p className="text-white/40 text-[10px] font-mono uppercase text-right mt-1">
                  Total da oferta: <span className="text-primary font-bold text-xs">{formatMoney(newQty * newPrice)}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MINHAS OFERTAS ────────────────────────────────── */}
      {tab === 'minhas' && (
        <div className="flex flex-col gap-3">
          {myOffers.length === 0 ? (
            <div className="text-center py-12 bg-surface-card border border-surface-border rounded-xl">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-white/40 text-xs font-mono uppercase tracking-widest">Nenhuma oferta ativa</p>
            </div>
          ) : (
            myOffers.map(o => {
              const item = TRADE_ITEMS.find(i => i.id === o.resource_type)
              const total = o.price_per_unit * o.quantity
              return (
                <div key={o.id} className="bg-surface-card border border-surface-border rounded-xl p-4 shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-bold text-xs uppercase tracking-wider mb-1">
                        {item?.emoji} {item?.label || o.resource_type}
                        <span className="text-primary/70 ml-2">{o.order_type === 'sell' ? '📤 VENDA' : '🛒 COMPRA'}</span>
                      </p>
                      <p className="text-white/50 text-[10px] font-mono uppercase tracking-widest">
                        {formatNumber(o.available_qty)}/{formatNumber(o.quantity)} · {formatMoney(o.price_per_unit)}/UN
                      </p>
                      <p className="text-white/30 text-[10px] font-mono uppercase mt-1">
                        Total: {formatMoney(total)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-[9px] font-bold font-mono uppercase px-2 py-0.5 border rounded
                        ${o.status === 'open' 
                          ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'}`}>
                        {o.status === 'open' ? 'Ativa' : 'Parcial'}
                      </span>
                      {o.status === 'open' && o.available_qty > 0 && (
                        <button
                          onClick={() => handleCancel(o.id)}
                          disabled={submitting}
                          className="text-red-400 hover:text-red-300 text-[10px] font-bold font-mono uppercase tracking-widest transition-colors mt-1"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}