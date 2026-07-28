'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useWar } from '@/hooks/useWar'
import { useAuthStore } from '@/store/authStore'
import { formatNumber } from '@/utils/format'
import { Swords, Shield, Users } from 'lucide-react'

const UNITS = [
  { key: 'soldiers',   label: 'Soldados',    emoji: '⚔️' },
  { key: 'tanks',      label: 'Tanques',      emoji: '🛡️' },
  { key: 'artillery',  label: 'Artilharia',   emoji: '💣' },
  { key: 'aircraft',   label: 'Aeronaves',    emoji: '✈️' },
  { key: 'helicopters',label: 'Helicópteros', emoji: '🚁' },
  { key: 'drones',     label: 'Drones',       emoji: '🤖' },
  { key: 'missiles',   label: 'Mísseis',      emoji: '🎯' },
  { key: 'warheads',   label: 'Ogivas',       emoji: '☢️' },
]

export default function WarPage() {
  const { myWars, worldWars, military, combatXP, loading, attack, proposePeace } = useWar()
  const { country: myCountry } = useAuthStore()

  const [attackWarId, setAttackWarId] = useState('')
  const [attackUnit, setAttackUnit] = useState('')
  const [attackQty, setAttackQty] = useState(1)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  async function handleAttack() {
    if (!attackWarId || !attackUnit) return
    setSubmitting(true)
    setFeedback('')
    const res = await attack(attackWarId, attackUnit, attackQty)
    if (res.success) {
      setFeedback(`✅ Ataque realizado! Dano: ${res.damage_dealt}`)
    } else {
      setFeedback(`❌ ${res.error || 'Erro ao atacar'}`)
    }
    setSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-4 pb-24 min-h-screen pt-4 max-w-4xl mx-auto w-full px-4">

      {/* ─── CABEÇALHO ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase flex items-center gap-2">
          <Swords size={16} /> GUERRAS
        </p>
        {combatXP && (
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <span>⚔️ XP: <span className="text-primary font-bold">{combatXP.experience || 0}</span></span>
            <span>|</span>
            <span>🏆 Guerras: <span className="text-white font-bold">{combatXP.wars_participated || 0}</span></span>
          </div>
        )}
      </div>

      {/* ─── MINHAS GUERRAS ────────────────────────────────────── */}
      <div>
        <h2 className="text-white/60 text-sm font-semibold mb-2">Suas Guerras</h2>
        {myWars.length === 0 ? (
          <div className="bg-surface-card rounded-xl p-6 text-center border border-white/5">
            <p className="text-4xl mb-2">🕊️</p>
            <p className="text-white/40 text-sm">Você não está em nenhuma guerra ativa.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {myWars.map((war) => {
              const isAttacker = war.attacker_id === Number(myCountry?.id)
              const myDamage = isAttacker ? war.damage_to_attacker : war.damage_to_defender
              const enemyDamage = isAttacker ? war.damage_to_defender : war.damage_to_attacker
              const enemy = isAttacker ? war.defender : war.attacker

              return (
                <div key={war.id} className="bg-surface-card rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{war.attacker?.flag_emoji}</span>
                      <div>
                        <p className="text-white font-bold text-sm">{war.attacker?.name}</p>
                        <p className="text-white/30 text-xs">Atacante</p>
                      </div>
                    </div>
                    <span className="text-white/30 text-xs font-bold">VS</span>
                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <p className="text-white font-bold text-sm">{war.defender?.name}</p>
                        <p className="text-white/30 text-xs">Defensor</p>
                      </div>
                      <span className="text-2xl">{war.defender?.flag_emoji}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="bg-black/20 rounded-lg p-2 text-center">
                      <span className="text-white/40 text-xs">Seu dano</span>
                      <p className="text-white font-bold text-base">{formatNumber(myDamage || 0)}</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-2 text-center">
                      <span className="text-white/40 text-xs">Dano inimigo</span>
                      <p className="text-white font-bold text-base">{formatNumber(enemyDamage || 0)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setAttackWarId(war.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Swords size={16} /> Atacar
                    </button>
                    <button
                      onClick={() => proposePeace(war.id)}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-lg transition-colors text-sm"
                    >
                      🕊️ Propor Paz
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── GUERRAS DO MUNDO ──────────────────────────────────── */}
      <div>
        <h2 className="text-white/60 text-sm font-semibold mb-2">Guerras no Mundo ({worldWars.length})</h2>
        {worldWars.length === 0 ? (
          <div className="bg-surface-card rounded-xl p-4 text-center border border-white/5">
            <p className="text-white/40 text-sm">Nenhuma guerra ativa no momento.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {worldWars.slice(0, 5).map((war) => (
              <div key={war.id} className="bg-surface-card rounded-xl p-3 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{war.attacker?.flag_emoji}</span>
                  <span className="text-white font-semibold text-sm">{war.attacker?.name}</span>
                </div>
                <span className="text-white/30 text-xs">⚔️</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">{war.defender?.name}</span>
                  <span className="text-xl">{war.defender?.flag_emoji}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── STATUS MILITAR ────────────────────────────────────── */}
      {military && (
        <div>
          <h2 className="text-white/60 text-sm font-semibold mb-2 flex items-center gap-2">
            <Shield size={16} /> Suas Forças
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {UNITS.map((unit) => (
              <div key={unit.key} className="bg-surface-card rounded-xl p-2 text-center border border-white/5">
                <span className="text-lg">{unit.emoji}</span>
                <p className="text-white font-bold text-sm">{formatNumber(military[unit.key] || 0)}</p>
                <p className="text-white/30 text-xs">{unit.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL DE ATAQUE ──────────────────────────────────── */}
      {attackWarId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl p-6 border-t border-white/5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Swords size={20} className="text-red-500" /> Enviar Ataque
              </h3>
              <button onClick={() => setAttackWarId('')} className="text-white/40 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <select
              value={attackUnit}
              onChange={(e) => setAttackUnit(e.target.value)}
              className="input-field mb-3"
            >
              <option value="">Selecionar unidade...</option>
              {UNITS.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.emoji} {u.label} (disp.: {formatNumber(military?.[u.key] ?? 0)})
                </option>
              ))}
            </select>

            <div className="flex gap-2 mb-3">
              <input
                type="number"
                min={1}
                value={attackQty}
                onChange={(e) => setAttackQty(Number(e.target.value))}
                className="input-field flex-1"
                placeholder="Quantidade"
              />
              <button
                onClick={handleAttack}
                disabled={!attackUnit || submitting}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white font-bold px-6 rounded-xl transition-colors"
              >
                {submitting ? 'Atacando...' : 'ATACAR'}
              </button>
            </div>

            {feedback && (
              <p className={`text-sm text-center p-2 rounded-lg ${feedback.startsWith('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {feedback}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}