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
    <div className="flex flex-col gap-4 pb-6">

      {/* ─── TABS ───────────────────────────────────────────── */}
      <div className="flex border-b border-white/5 px-4 pt-4">
        <button
          onClick={() => setTab('comprar')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors
            ${tab === 'comprar' ? 'text-primary-light border-b-2 border-primary-light' : 'text-white/30'}`}
        >
          🛒 Comprar
        </button>
        <button
          onClick={() => setTab('minhas')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors
            ${tab === 'minhas' ? 'text-primary-light border-b-2 border-primary-light' : 'text-white/30'}`}
        >
          📋 Minhas Ofertas
        </button>
      </div>

      {tab === 'comprar' && (
        <div className="px-4 flex flex-col gap-4">

          {/* ─── FILTROS ─────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as any)}
              className="input-field flex-1 min-w-[120px] text-sm"
            >
              <option value="all">Todos os itens</option>
              <option value="resource">📦 Recursos</option>
              <option value="military">⚔️ Equipamentos</option>
            </select>
            <select
              value={filterItem}
              onChange={e => setFilterItem(e.target.value)}
              className="input-field flex-1 min-w-[120px] text-sm"
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
            <p className={`text-sm px-3 py-2 rounded-lg ${
              feedback.includes('✅') ? 'text-green-400 bg-green-500/10' :
              feedback.includes('❌') ? 'text-red-400 bg-red-500/10' :
              'text-yellow-400 bg-yellow-500/10'
            }`}>
              {feedback}
            </p>
          )}

          {/* ─── LISTA DE OFERTAS GLOBAIS ───────────────────── */}
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-white/30">
              <p className="text-3xl mb-2">📦</p>
              <p className="text-sm">Nenhuma oferta de venda disponível</p>
            </div>
          ) : (
            filtered.map(offer => {
              const item = TRADE_ITEMS.find(i => i.id === offer.resource_type)
              const qty = buyQtys[offer.id] ?? 1
              const total = offer.price_per_unit * qty
              return (
                <div key={offer.id} className="bg-surface-card rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{(offer.countries as any)?.flag_emoji ?? '🌐'}</span>
                    <div className="flex-1">
                      <p className="text-white/70 text-xs font-semibold">{(offer.countries as any)?.name}</p>
                      <p className="text-white/40 text-xs">
                        {item?.emoji} {item?.label || offer.resource_type}
                        {item?.category === 'military' && ' ⚔️'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-sm">{formatMoney(offer.price_per_unit)}/un</p>
                      <p className="text-white/40 text-xs">Disp: {formatNumber(offer.available_qty)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={offer.available_qty}
                        value={qty}
                        onChange={e => setBuyQtys(prev => ({ ...prev, [offer.id]: Number(e.target.value) }))}
                        className="input-field w-20 py-2 text-sm"
                        placeholder="Qtd"
                      />
                      <span className="text-white/40 text-xs">
                        = {formatMoney(total)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleBuy(offer.id)}
                      disabled={submitting}
                      className="bg-primary hover:bg-primary-light disabled:opacity-30 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
                    >
                      COMPRAR
                    </button>
                  </div>
                </div>
              )
            })
          )}

          {/* ─── CRIAR OFERTA DE VENDA ────────────────────── */}
          <div className="border-t border-white/5 pt-4">
            <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">
              📤 CRIAR OFERTA DE VENDA
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <select
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  className="input-field flex-1 text-sm"
                >
                  {TRADE_ITEMS.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.emoji} {item.label} {item.category === 'military' ? '(⚔️)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-white/40 text-xs block mb-1">Quantidade</label>
                  <input
                    type="number"
                    value={newQty}
                    onChange={e => setNewQty(Number(e.target.value))}
                    className="input-field w-full text-sm"
                    min={1}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-white/40 text-xs block mb-1">Preço por unidade (R$)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={e => setNewPrice(Number(e.target.value))}
                    className="input-field w-full text-sm"
                    min={1}
                  />
                </div>
                <div className="flex-1 flex items-end">
                  <button
                    onClick={handlePlace}
                    disabled={submitting}
                    className="w-full bg-primary hover:bg-primary-light disabled:opacity-30 text-white font-bold py-2 rounded-xl text-sm transition-colors"
                  >
                    {submitting ? 'Publicando...' : 'PUBLICAR'}
                  </button>
                </div>
              </div>
              {newQty > 0 && newPrice > 0 && (
                <p className="text-white/30 text-xs text-right">
                  Total da oferta: <span className="text-white font-semibold">{formatMoney(newQty * newPrice)}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MINHAS OFERTAS ────────────────────────────────── */}
      {tab === 'minhas' && (
        <div className="px-4 flex flex-col gap-3">
          {myOffers.length === 0 ? (
            <div className="text-center py-10 text-white/30">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">Nenhuma oferta ativa</p>
            </div>
          ) : (
            myOffers.map(o => {
              const item = TRADE_ITEMS.find(i => i.id === o.resource_type)
              const total = o.price_per_unit * o.quantity
              return (
                <div key={o.id} className="bg-surface-card rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {item?.emoji} {item?.label || o.resource_type}
                        {o.order_type === 'sell' ? ' 📤 Venda' : ' 🛒 Compra'}
                      </p>
                      <p className="text-white/40 text-xs">
                        {formatNumber(o.available_qty)}/{formatNumber(o.quantity)} · {formatMoney(o.price_per_unit)}/un
                      </p>
                      <p className="text-white/30 text-xs">
                        Total: {formatMoney(total)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                        ${o.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {o.status === 'open' ? 'Ativa' : 'Parcial'}
                      </span>
                      {o.status === 'open' && o.available_qty > 0 && (
                        <button
                          onClick={() => handleCancel(o.id)}
                          disabled={submitting}
                          className="text-red-400 hover:text-red-300 text-xs font-semibold transition-colors"
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