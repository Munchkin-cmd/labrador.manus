'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMarket } from '@/hooks/useMenu'
import { useAuthStore } from '@/store/authStore'
import { formatMoney, formatNumber } from '@/utils/format'
import { supabase } from '@/lib/supabase/client'
import { 
  Coins, Pickaxe, Droplet, Wheat, Trees, Radiation, 
  Hammer, Anvil, User, Shield, Bomb, Plane, Target, 
  Skull, Swords, History, X, ArrowRightLeft, 
  ShoppingCart, Tag, Loader2, ChevronDown, Package
} from 'lucide-react'

// ─── ITENS COMERCIAIS (Apenas Ícones, sem Emojis) ──────────
const TRADE_ITEMS = [
  { id: 'gold',    label: 'Ouro',     icon: Coins,    category: 'resource' },
  { id: 'iron',    label: 'Ferro',    icon: Pickaxe,  category: 'resource' },
  { id: 'oil',     label: 'Petróleo', icon: Droplet,  category: 'resource' },
  { id: 'food',    label: 'Comida',   icon: Wheat,    category: 'resource' },
  { id: 'wood',    label: 'Madeira',  icon: Trees,    category: 'resource' },
  { id: 'uranium', label: 'Urânio',   icon: Radiation,category: 'resource' },
  { id: 'coal',    label: 'Carvão',   icon: Anvil,    category: 'resource' },
  { id: 'steel',   label: 'Aço',      icon: Hammer,   category: 'resource' },
  
  { id: 'soldiers',   label: 'Soldados',    icon: User,   category: 'military' },
  { id: 'tanks',      label: 'Tanques',     icon: Shield, category: 'military' },
  { id: 'artillery',  label: 'Artilharia',  icon: Bomb,   category: 'military' },
  { id: 'aircraft',   label: 'Aeronaves',   icon: Plane,  category: 'military' },
  { id: 'helicopters',label: 'Helicópteros',icon: Plane,  category: 'military' },
  { id: 'drones',     label: 'Drones',      icon: Target, category: 'military' },
  { id: 'missiles',   label: 'Mísseis',     icon: Swords, category: 'military' },
  { id: 'warheads',   label: 'Ogivas',      icon: Skull,  category: 'military' },
]

const ITEM_MAP = Object.fromEntries(TRADE_ITEMS.map(item => [item.id, item]))

type Transaction = {
  id: string
  created_at: string
  resource_type: string
  quantity: number
  price_per_unit: number
  total_value: number
  buyer_id: number
  seller_id: number
  buyer: { name: string; flag_emoji: string }
  seller: { name: string; flag_emoji: string }
}

// ─── COMPONENTE CUSTOMIZADO DE DROPDOWN ──────────────────
function CustomDropdown({ 
  options, 
  value, 
  onChange, 
  placeholder = "Selecionar..." 
}: { 
  options: { id: string; label: string; icon: any }[], 
  value: string, 
  onChange: (val: string) => void,
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = options.find(o => o.id === value)

  return (
    <div className="relative w-full z-10">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input-field w-full flex items-center justify-between bg-surface-input py-2.5"
      >
        <div className="flex items-center gap-2">
          {selected ? (
            <>
              <selected.icon size={16} className="text-primary" />
              <span className="text-white text-sm">{selected.label}</span>
            </>
          ) : (
            <span className="text-white/50 text-sm">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface-card border border-surface-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
            {options.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors ${
                  value === opt.id ? 'bg-primary/10 text-primary font-bold' : 'text-white/80'
                }`}
              >
                <opt.icon size={16} />
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function MercadoPage() {
  const { country } = useAuthStore()
  const { offers, myOffers, loading, placeOrder, buyOffer, cancelOrder, refetch } = useMarket()
  
  const [tab, setTab] = useState<'comprar' | 'minhas'>('comprar')
  const [filterItem, setFilterItem] = useState('')
  const [filterCategory, setFilterCategory] = useState<'all' | 'resource' | 'military'>('all')
  
  // ✅ Inputs começam vazios
  const [newItem, setNewItem] = useState('gold')
  const [newQty, setNewQty] = useState<number | ''>('')
  const [newPrice, setNewPrice] = useState<number | ''>('')
  const [buyQtys, setBuyQtys] = useState<Record<string, number | ''>>({})
  
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // ✅ Histórico de Transações
  const [showHistory, setShowHistory] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const fetchHistory = useCallback(async () => {
    if (!country?.id) return
    setLoadingHistory(true)
    try {
      const { data } = await supabase
        .from('market_transactions')
        .select(`
          *,
          buyer:countries!market_transactions_buyer_id_fkey(name, flag_emoji),
          seller:countries!market_transactions_seller_id_fkey(name, flag_emoji)
        `)
        .or(`buyer_id.eq.${country.id},seller_id.eq.${country.id}`)
        .order('created_at', { ascending: false })

      if (data) setTransactions(data as any)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }, [country?.id])

  useEffect(() => {
    if (showHistory) fetchHistory()
  }, [showHistory, fetchHistory])

  // Filtra as opções do dropdown de itens baseado na categoria
  const filteredDropdownItems = TRADE_ITEMS.filter(
    item => filterCategory === 'all' || item.category === filterCategory
  )

  const filteredOffers = offers.filter(o => {
    if (filterItem && o.resource_type !== filterItem) return false
    if (filterCategory !== 'all') {
      const item = ITEM_MAP[o.resource_type]
      if (!item || item.category !== filterCategory) return false
    }
    return true
  })

  async function handlePlace() {
    const qty = Number(newQty)
    const price = Number(newPrice)
    if (!qty || qty <= 0 || !price || price <= 0) {
      setFeedback('❌ Preencha a quantidade e o preço corretamente.')
      return
    }

    setSubmitting(true)
    setFeedback('')
    const res = await placeOrder(newItem, 'sell', qty, price)
    
    if ((res as any)?.success) {
      setFeedback('✅ Oferta publicada com sucesso!')
      setNewQty('')
      setNewPrice('')
      refetch()
    } else {
      setFeedback('❌ ' + ((res as any)?.error || 'Erro ao publicar'))
    }
    setSubmitting(false)
    setTimeout(() => setFeedback(''), 4000)
  }

  async function handleBuy(orderId: string) {
    const qty = Number(buyQtys[orderId])
    if (!qty || qty <= 0) {
      setFeedback('❌ Digite uma quantidade válida.')
      return
    }

    setSubmitting(true)
    setFeedback('')
    const res = await buyOffer(orderId, qty)
    
    if ((res as any)?.success) {
      setFeedback('✅ Compra realizada com sucesso!')
      setBuyQtys(prev => ({ ...prev, [orderId]: '' }))
      refetch()
    } else {
      setFeedback('❌ ' + ((res as any)?.error || 'Erro ao comprar'))
    }
    setSubmitting(false)
    setTimeout(() => setFeedback(''), 4000)
  }

  async function handleCancel(orderId: string) {
    if (!confirm('Tem certeza que deseja cancelar esta oferta?')) return
    setSubmitting(true)
    setFeedback('')
    const res = await cancelOrder(orderId)
    if (res.success) {
      setFeedback('✅ Oferta cancelada com sucesso!')
      refetch()
    } else {
      setFeedback('❌ ' + (res.error || 'Erro ao cancelar'))
    }
    setSubmitting(false)
    setTimeout(() => setFeedback(''), 4000)
  }

  if (loading) return <Loading />

  // Opções para os dropdowns
  const categoryOptions = [
    { id: 'all', label: 'Todos os itens', icon: Package },
    { id: 'resource', label: 'Recursos', icon: Coins },
    { id: 'military', label: 'Equipamentos', icon: Shield },
  ]

  const itemFilterOptions = [
    { id: '', label: 'Todos', icon: Package },
    ...filteredDropdownItems
  ]

  return (
    <div className="flex flex-col gap-4 pb-24 min-h-screen w-full max-w-4xl mx-auto px-4 sm:px-6 pt-24">
      
      {/* ─── HEADER E HISTÓRICO ─────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          <p className="text-xs font-bold tracking-widest text-white uppercase font-mono">Mercado Global</p>
        </div>
        <button 
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 bg-surface-card border border-surface-border hover:bg-surface-input px-3 py-1.5 rounded-lg text-[10px] font-bold text-white/70 hover:text-white transition-colors uppercase tracking-widest"
        >
          <History size={14} /> Histórico de Transações
        </button>
      </div>

      {/* ─── TABS ───────────────────────────────────────────── */}
      <div className="flex border-b border-surface-border mb-2">
        <button
          onClick={() => setTab('comprar')}
          className={`flex-1 py-3 text-[11px] font-bold font-mono uppercase tracking-widest transition-colors flex items-center justify-center gap-2
            ${tab === 'comprar' ? 'text-primary border-b-2 border-primary' : 'text-white/40 hover:text-white/70'}`}
        >
          <ShoppingCart size={14} /> Comprar
        </button>
        <button
          onClick={() => setTab('minhas')}
          className={`flex-1 py-3 text-[11px] font-bold font-mono uppercase tracking-widest transition-colors flex items-center justify-center gap-2
            ${tab === 'minhas' ? 'text-primary border-b-2 border-primary' : 'text-white/40 hover:text-white/70'}`}
        >
          <Tag size={14} /> Minhas Ofertas
        </button>
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

      {tab === 'comprar' && (
        <div className="flex flex-col gap-4">
          
          {/* ─── FILTROS (Custom Dropdowns) ─── */}
          <div className="flex flex-wrap gap-2 z-20">
            <div className="flex-1 min-w-[140px]">
              <CustomDropdown 
                options={categoryOptions}
                value={filterCategory}
                onChange={(val) => {
                  setFilterCategory(val as any)
                  setFilterItem('') // Reseta o item ao trocar categoria
                }}
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <CustomDropdown 
                options={itemFilterOptions}
                value={filterItem}
                onChange={(val) => setFilterItem(val)}
              />
            </div>
          </div>

          {/* ─── LISTA DE OFERTAS ───────────────────── */}
          {filteredOffers.length === 0 ? (
            <div className="text-center py-12 bg-surface-card border border-surface-border rounded-xl mt-2">
              <Package size={40} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-xs font-mono uppercase tracking-widest">Nenhuma oferta de venda disponível</p>
            </div>
          ) : (
            filteredOffers.map(offer => {
              const item = ITEM_MAP[offer.resource_type]
              const Icon = item?.icon || Coins
              const qty = Number(buyQtys[offer.id]) || 0
              const total = offer.price_per_unit * qty
              
              return (
                <div key={offer.id} className="bg-surface-card border border-surface-border rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl drop-shadow-md">{(offer.countries as any)?.flag_emoji ?? '🌐'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold uppercase tracking-wider truncate">{(offer.countries as any)?.name}</p>
                      <div className="flex items-center gap-1.5 text-primary/70 text-[10px] font-mono mt-0.5 uppercase tracking-widest">
                        <Icon size={12} /> {item?.label || offer.resource_type}
                      </div>
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
                        value={buyQtys[offer.id] === undefined ? '' : buyQtys[offer.id]}
                        onChange={e => setBuyQtys(prev => ({ ...prev, [offer.id]: e.target.value === '' ? '' : Number(e.target.value) }))}
                        className="input-field w-20 py-2 text-sm bg-surface-input text-center font-mono"
                        placeholder="0"
                      />
                      {qty > 0 && (
                        <span className="text-white/60 text-[10px] font-mono flex items-center gap-1">
                          <ArrowRightLeft size={10} /> {formatMoney(total)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleBuy(offer.id)}
                      disabled={submitting}
                      className="bg-primary hover:bg-primary-dark disabled:opacity-30 text-white font-bold px-5 py-2 rounded-lg text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                      {submitting ? <Loader2 size={12} className="animate-spin" /> : 'Comprar'}
                    </button>
                  </div>
                </div>
              )
            })
          )}

          {/* ─── CRIAR OFERTA DE VENDA ────────────────────── */}
          <div className="mt-4 pt-6 border-t border-surface-border z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <p className="text-xs font-bold tracking-widest text-white uppercase font-mono">
                Criar Oferta de Venda
              </p>
            </div>
            
            <div className="bg-surface-card border border-surface-border rounded-xl p-4 sm:p-5 shadow-lg flex flex-col gap-3">
              <div className="flex gap-2">
                <CustomDropdown 
                  options={TRADE_ITEMS}
                  value={newItem}
                  onChange={setNewItem}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-white/50 text-[10px] font-mono uppercase tracking-widest block mb-1">Quantidade</label>
                  <input
                    type="number"
                    value={newQty}
                    onChange={e => setNewQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="input-field w-full text-sm bg-surface-input font-mono"
                    placeholder="0"
                    min={1}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-white/50 text-[10px] font-mono uppercase tracking-widest block mb-1">Preço Unitário (R$)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="input-field w-full text-sm bg-surface-input font-mono"
                    placeholder="0"
                    min={1}
                  />
                </div>
                <div className="flex items-end sm:w-32">
                  <button
                    onClick={handlePlace}
                    disabled={submitting}
                    className="w-full bg-primary hover:bg-primary-dark disabled:opacity-30 text-white font-bold py-2.5 rounded-lg text-[10px] uppercase tracking-widest transition-colors shadow-lg shadow-primary/20 h-[42px] flex items-center justify-center"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Publicar'}
                  </button>
                </div>
              </div>
              
              {Number(newQty) > 0 && Number(newPrice) > 0 && (
                <p className="text-white/40 text-[10px] font-mono uppercase text-right mt-1">
                  Total da oferta: <span className="text-primary font-bold text-xs">{formatMoney(Number(newQty) * Number(newPrice))}</span>
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
              <Tag size={40} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-xs font-mono uppercase tracking-widest">Nenhuma oferta ativa</p>
            </div>
          ) : (
            myOffers.map(o => {
              const item = ITEM_MAP[o.resource_type]
              const Icon = item?.icon || Coins
              const total = o.price_per_unit * o.quantity
              return (
                <div key={o.id} className="bg-surface-card border border-surface-border rounded-xl p-4 shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={16} className="text-primary" />
                        <p className="text-white font-bold text-xs uppercase tracking-wider">
                          {item?.label || o.resource_type}
                        </p>
                        <span className="text-primary/70 text-[10px] font-bold">
                          {o.order_type === 'sell' ? 'VENDA' : 'COMPRA'}
                        </span>
                      </div>
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

      {/* ─── MODAL DE HISTÓRICO ────────────────────────────── */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative">
            
            <div className="flex items-center justify-between p-5 border-b border-surface-border">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <History className="text-primary" /> Histórico de Transações
              </h2>
              <button onClick={() => setShowHistory(false)} className="text-white/40 hover:text-white bg-surface-input p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 flex-1 space-y-3 custom-scrollbar">
              {loadingHistory ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={32} /></div>
              ) : transactions.length === 0 ? (
                <p className="text-white/40 text-center py-8 font-mono">Nenhuma transação realizada ainda.</p>
              ) : (
                transactions.map(tx => {
                  const item = ITEM_MAP[tx.resource_type]
                  const Icon = item?.icon || Coins
                  const isBuyer = Number(tx.buyer_id) === Number(country?.id)
                  
                  return (
                    <div key={tx.id} className="bg-surface-input border border-surface-border rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isBuyer ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                          {isBuyer ? <ShoppingCart size={20} /> : <Tag size={20} />}
                        </div>
                        <div>
                          <p className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <Icon size={12} /> {item?.label || tx.resource_type}
                          </p>
                          <p className="text-white/50 text-[10px] font-mono mt-0.5">
                            {isBuyer ? 'Comprado de' : 'Vendido para'}: <span className="text-white">{isBuyer ? tx.seller?.name : tx.buyer?.name}</span>
                          </p>
                          <p className="text-white/30 text-[9px] font-mono uppercase mt-0.5">
                            {new Date(tx.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm font-mono ${isBuyer ? 'text-red-400' : 'text-green-400'}`}>
                          {isBuyer ? '-' : '+'}{formatMoney(tx.total_value)}
                        </p>
                        <p className="text-white/40 text-[10px] font-mono">
                          {formatNumber(tx.quantity)} un x {formatMoney(tx.price_per_unit)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
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