'use client'

import { useState } from 'react'
import { useWar, War } from '@/hooks/useWar'
import { useAuthStore } from '@/store/authStore'
import { formatNumber } from '@/utils/format'
import { Swords, Check, X, Clock, MapPin, Users, ChevronDown, ChevronUp, Landmark, History, Trophy } from 'lucide-react'

const UNITS = [
  { key: 'soldiers',    label: 'Soldados',    emoji: '⚔️' },
  { key: 'tanks',       label: 'Tanques',     emoji: '🛡️' },
  { key: 'artillery',   label: 'Artilharia',  emoji: '💣' },
  { key: 'aircraft',    label: 'Aeronaves',   emoji: '✈️' },
  { key: 'helicopters', label: 'Helicópteros',emoji: '🚁' },
  { key: 'drones',      label: 'Drones',      emoji: '🤖' },
  { key: 'missiles',    label: 'Mísseis',     emoji: '🎯' },
  { key: 'warheads',    label: 'Ogivas',      emoji: '☢️' },
]

export default function WarPage() {
  const {
    myWars, worldWars, endedWars, military, combatXP, loading,
    attack, proposePeace, acceptPeace, rejectPeace, proposeJoinWar, leaveWar,
  } = useWar()
  const { country: myCountry } = useAuthStore()

  const [attackWarId, setAttackWarId] = useState('')
  const [attackUnit, setAttackUnit] = useState('')
  const [attackQty, setAttackQty] = useState(1)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [peaceLoading, setPeaceLoading] = useState<string | null>(null)
  const [joining, setJoining] = useState<string | null>(null)
  
  const [showHistory, setShowHistory] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  async function handleAttack() {
    if (!attackWarId || !attackUnit) return
    setSubmitting(true); setFeedback('')
    const res = await attack(attackWarId, attackUnit, attackQty)
    
    if (res.success) {
      // ✅ Verifica se a vitória foi alcançada (3 milhões)
      if (res.victory) {
        setFeedback(`🏆 ${res.message}`)
        setTimeout(() => { 
          setAttackWarId(''); setFeedback(''); setAttackQty(1); setAttackUnit('') 
        }, 4000)
      } else {
        setFeedback(`✅ Ataque realizado! Dano: ${formatNumber(res.damage_dealt)} | Perdas: ${formatNumber(res.losses_suffered)}`)
        setTimeout(() => { 
          setAttackWarId(''); setFeedback(''); setAttackQty(1); setAttackUnit('') 
        }, 2500)
      }
    } else {
      setFeedback(`❌ ${res.error || 'Erro ao atacar'}`)
    }
    setSubmitting(false)
  }

  async function handleProposePeace(warId: string) {
    if (!confirm('Tem certeza que deseja propor paz? O inimigo poderá aceitar ou recusar.')) return
    setPeaceLoading(warId)
    const res = await proposePeace(warId)
    alert(res.success ? '🕊️ Proposta de paz enviada!' : `❌ ${res.error}`)
    setPeaceLoading(null)
  }

  async function handleAcceptPeace(warId: string) {
    if (!confirm('Aceitar a paz encerrará a guerra permanentemente. Confirmar?')) return
    setPeaceLoading(warId)
    const res = await acceptPeace(warId)
    alert(res.success ? '🕊️ Paz aceita! Guerra encerrada.' : `❌ ${res.error}`)
    setPeaceLoading(null)
  }

  async function handleRejectPeace(warId: string) {
    if (!confirm('Recusar a paz fará a guerra continuar. Confirmar?')) return
    setPeaceLoading(warId)
    const res = await rejectPeace(warId)
    alert(res.success ? '❌ Paz recusada. A guerra continua.' : `❌ ${res.error}`)
    setPeaceLoading(null)
  }

  async function handleJoinWar(warId: string, side: 'attacker' | 'defender', targetId: number) {
    setJoining(warId)
    const res = await proposeJoinWar(warId, side, targetId)
    alert(res.success ? res.message : `❌ ${res.error}`)
    setJoining(null)
  }

  async function handleLeaveWar(warId: string) {
    if (!confirm('Tem certeza que deseja sair desta guerra? Seu dano já causado continuará contabilizado no placar geral.')) return
    setPeaceLoading(warId)
    const res = await leaveWar(warId)
    alert(res.success ? res.message : `❌ ${res.error}`)
    setPeaceLoading(null)
  }

  return (
    <div className="flex flex-col gap-6 pb-24 min-h-screen pt-4 max-w-4xl mx-auto w-full px-4">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Swords className="text-primary" size={24} /> Guerra
          </h1>
          {combatXP && (
            <p className="text-xs text-white/40 mt-1">
              ⚔️ XP: <span className="text-primary font-bold">{combatXP.experience || 0}</span>
              {' '} | 🏆 Guerras: <span className="text-white font-bold">{combatXP.wars_participated || 0}</span>
            </p>
          )}
        </div>
      </div>

      {/* ─── MINHAS GUERRAS ────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Suas Guerras</p>
        {myWars.length === 0 ? (
          <div className="bg-surface-card rounded-xl p-8 text-center border border-white/5">
            <p className="text-5xl mb-3">🕊️</p>
            <p className="text-white/40 text-sm">Você não está em nenhuma guerra ativa.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {myWars.map((war: War) => (
              <WarCard 
                key={war.id} war={war} myCountryId={Number(myCountry?.id)}
                onAttack={() => setAttackWarId(war.id)}
                onProposePeace={() => handleProposePeace(war.id)}
                onAcceptPeace={() => handleAcceptPeace(war.id)}
                onRejectPeace={() => handleRejectPeace(war.id)}
                onLeaveWar={() => handleLeaveWar(war.id)}
                enemyProposedPeace={war.pending_peace_from !== null && Number(war.pending_peace_from) !== Number(myCountry?.id)}
                iProposedPeace={war.pending_peace_from !== null && Number(war.pending_peace_from) === Number(myCountry?.id)}
                peaceLoading={peaceLoading === war.id}
                isWorldWar={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── GUERRAS DO MUNDO ────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Guerras no Mundo ({worldWars.length})</p>
        {worldWars.length === 0 ? (
          <div className="bg-surface-card rounded-xl p-4 text-center border border-white/5">
            <p className="text-white/40 text-sm">Nenhuma guerra ativa no momento.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {worldWars.map((war: War) => (
              <WarCard 
                key={war.id} war={war} myCountryId={Number(myCountry?.id)} isWorldWar={true}
                onAttack={() => setAttackWarId(war.id)}
                onProposePeace={() => handleProposePeace(war.id)}
                onAcceptPeace={() => handleAcceptPeace(war.id)}
                onRejectPeace={() => handleRejectPeace(war.id)}
                onLeaveWar={() => handleLeaveWar(war.id)}
                enemyProposedPeace={war.pending_peace_from !== null && Number(war.pending_peace_from) !== Number(myCountry?.id)}
                iProposedPeace={war.pending_peace_from !== null && Number(war.pending_peace_from) === Number(myCountry?.id)}
                peaceLoading={peaceLoading === war.id}
                onJoinAttacker={() => handleJoinWar(war.id, 'attacker', war.attacker_id)}
                onJoinDefender={() => handleJoinWar(war.id, 'defender', war.defender_id)}
                joining={joining === war.id}
              />
            ))}
          </div>
        )}
      </div>

      <button 
        onClick={() => setShowHistory(true)}
        className="mt-4 flex items-center justify-center gap-2 w-full py-4 bg-surface-card hover:bg-white/5 border border-white/10 rounded-xl transition-colors text-white font-bold text-sm"
      >
        <History size={18} className="text-white/60" />
        HISTÓRICO DE GUERRA
      </button>

      {showHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-5 sm:p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative">
            
            <button onClick={() => setShowHistory(false)} className="absolute top-4 right-4 text-white/40 hover:text-white bg-black/20 p-2 rounded-full transition-colors">
              <X size={20} />
            </button>

            <h2 className="text-xl font-black text-white flex items-center gap-2 mb-6">
              <History className="text-primary" /> Histórico de Guerras
            </h2>

            <div className="overflow-y-auto flex-1 pr-2 space-y-3">
              {endedWars.length === 0 ? (
                <p className="text-white/40 text-center py-8">Nenhuma guerra encerrada ainda.</p>
              ) : (
                endedWars.map((war: War) => {
                  const isAttackerWinner = Number(war.winner_id) === Number(war.attacker_id);
                  const isDefenderWinner = Number(war.winner_id) === Number(war.defender_id);
                  
                  return (
                    <div key={war.id} className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-[10px] text-white/40 uppercase font-bold border-b border-white/5 pb-2">
                        <span>{new Date(war.started_at).toLocaleDateString('pt-BR')}</span>
                        <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Encerrada</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className={`flex flex-col items-center flex-1 ${isAttackerWinner ? 'opacity-100' : 'opacity-50'}`}>
                          <span className="text-2xl mb-1">{war.attacker?.flag_emoji}</span>
                          <p className="text-white text-xs font-bold text-center">{war.attacker?.name}</p>
                          {isAttackerWinner && <span className="text-[10px] text-yellow-400 font-bold mt-1 flex items-center gap-1"><Trophy size={10}/> Vencedor</span>}
                        </div>

                        <div className="px-4 text-white/20 font-black italic text-sm">VS</div>

                        <div className={`flex flex-col items-center flex-1 ${isDefenderWinner ? 'opacity-100' : 'opacity-50'}`}>
                          <span className="text-2xl mb-1">{war.defender?.flag_emoji}</span>
                          <p className="text-white text-xs font-bold text-center">{war.defender?.name}</p>
                          {isDefenderWinner && <span className="text-[10px] text-yellow-400 font-bold mt-1 flex items-center gap-1"><Trophy size={10}/> Vencedor</span>}
                        </div>
                      </div>

                      {!war.winner_id && (
                        <p className="text-center text-xs text-blue-400 font-bold mt-1">🕊️ Acordo de Paz</p>
                      )}

                      <div className="flex justify-between text-[10px] text-white/50 bg-white/5 p-2 rounded mt-1">
                        <span>Dano Atacante: <strong className="text-white">{formatNumber(war.damage_to_defender || 0)}</strong></span>
                        <span>Dano Defensor: <strong className="text-white">{formatNumber(war.damage_to_attacker || 0)}</strong></span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {attackWarId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center sm:items-center">
          <div className="w-full max-w-lg bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl p-6 border border-white/10 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Swords size={20} className="text-red-500" /> Enviar Ataque
              </h3>
              <button onClick={() => { setAttackWarId(''); setFeedback('') }} className="text-white/40 hover:text-white text-xl">
                <X size={24} />
              </button>
            </div>
            <label className="text-white/60 text-sm font-semibold block mb-1.5">Unidade</label>
            <select value={attackUnit} onChange={(e) => setAttackUnit(e.target.value)} className="input-field mb-4 w-full bg-black/40">
              <option value="">Selecionar unidade...</option>
              {UNITS.map((u) => (
                <option key={u.key} value={u.key}>{u.emoji} {u.label} (disp.: {formatNumber(military?.[u.key] ?? 0)})</option>
              ))}
            </select>
            <label className="text-white/60 text-sm font-semibold block mb-1.5">Quantidade</label>
            <div className="flex gap-2 mb-5">
              <input type="number" min={1} max={military?.[attackUnit] ?? 1} value={attackQty} onChange={(e) => setAttackQty(Number(e.target.value))} className="input-field flex-1 bg-black/40" placeholder="Qtd" />
              <button onClick={handleAttack} disabled={!attackUnit || submitting} className="bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white font-bold px-6 rounded-xl transition-colors shadow-lg">
                {submitting ? 'Atacando...' : 'ATACAR'}
              </button>
            </div>
            {feedback && (
              <p className={`text-sm text-center p-3 rounded-lg font-semibold ${feedback.startsWith('✅') || feedback.startsWith('🏆') ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {feedback}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE DO CARD DE GUERRA
// ═══════════════════════════════════════════════════════════════

function WarCard({ 
  war, myCountryId, onAttack, onProposePeace, onAcceptPeace, onRejectPeace, onLeaveWar,
  enemyProposedPeace, iProposedPeace, peaceLoading, isWorldWar, onJoinAttacker, onJoinDefender, joining
}: any) {
  
  const [isExpanded, setIsExpanded] = useState(false);

  const isAttacker = Number(war.attacker_id) === Number(myCountryId);
  const isDefender = Number(war.defender_id) === Number(myCountryId);
  const isAllyAttacker = war.participants?.some((p: any) => Number(p.country_id) === Number(myCountryId) && p.side === 'attacker');
  const isAllyDefender = war.participants?.some((p: any) => Number(p.country_id) === Number(myCountryId) && p.side === 'defender');
  
  const canAttack = isAttacker || isDefender || isAllyAttacker || isAllyDefender;
  const canProposePeace = isAttacker || isDefender;

  const attDmg = war.damage_to_defender || 0; 
  const defDmg = war.damage_to_attacker || 0; 
  const totalDmg = attDmg + defDmg;
  const attPct = totalDmg === 0 ? 50 : Math.round((attDmg / totalDmg) * 100);
  const defPct = totalDmg === 0 ? 50 : 100 - attPct;

  const getFlag = (countryData: any) => {
    if (!countryData?.users) return null;
    if (Array.isArray(countryData.users)) return countryData.users[0]?.flag_url;
    return countryData.users.flag_url;
  };

  const FlagAvatar = ({ country, borderColor }: { country: any, borderColor: string }) => {
    const flagUrl = getFlag(country);
    const initials = country?.name ? country.name.substring(0, 2).toUpperCase() : '🌐';
    
    return (
      <div className={`w-12 h-12 rounded-full border-2 ${borderColor} overflow-hidden bg-black/50 shadow-lg shrink-0 flex items-center justify-center`}>
        {flagUrl ? (
          <img src={flagUrl} alt={country.name} className="w-full h-full object-cover" />
        ) : country?.flag_emoji ? (
          <span className="text-2xl">{country.flag_emoji}</span>
        ) : (
          <span className="text-white/70 font-bold text-sm">{initials}</span>
        )}
      </div>
    )
  }

  const attParticipants = war.participants?.filter((p: any) => p.side === 'attacker') || [];
  const defParticipants = war.participants?.filter((p: any) => p.side === 'defender') || [];

  return (
    <div className="relative bg-[#151526] rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-b from-[#2a2a4a] to-[#0f0f1a] opacity-80" />
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 p-5">
        
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className={`${canAttack ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-red-500/20 border-red-500/30 text-red-400'} border text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded inline-block mb-2`}>
              {canAttack 
                ? (isAttacker || isAllyAttacker ? 'Lutando pelo Atacante' : 'Lutando pelo Defensor') 
                : (war.status === 'active' ? 'Guerra Ativa' : 'Golpe de Estado')}
            </span>
            <h3 className="text-lg font-black text-white flex items-center gap-2 drop-shadow-md">
              <MapPin size={18} className="text-emerald-400 shrink-0" />
              {war.attacker_region?.name || 'Origem'} 
              <span className="text-white/30 text-xs italic">vs</span> 
              {war.defender_region?.name || 'Alvo'}
            </h3>
            <p className="text-white/40 text-[10px] uppercase font-semibold mt-1">Terreno: {war.terrain || 'Desconhecido'}</p>
          </div>
          <div className="bg-black/60 px-3 py-1.5 rounded-lg text-white/70 text-[10px] font-mono flex items-center gap-1.5 border border-white/5">
            <Clock size={12} className="text-white/40" /> Ativa
          </div>
        </div>

        <div className="mb-5">
          <div className="flex justify-between items-center text-[10px] text-white/40 font-bold uppercase mb-1">
            <span>Progresso de Dano</span>
            <span>Meta: 3.000.000</span>
          </div>
          <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden flex shadow-inner mb-2">
            <div style={{ width: `${attPct}%` }} className="h-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
            <div style={{ width: `${defPct}%` }} className="h-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
          </div>
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-black text-sm">{attPct}%</span>
              <span className="text-white font-bold text-base">{formatNumber(attDmg)}</span>
              <span className="text-white/40 text-[10px] uppercase">dano</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-[10px] uppercase">dano</span>
              <span className="text-white font-bold text-base">{formatNumber(defDmg)}</span>
              <span className="text-blue-400 font-black text-sm">{defPct}%</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center bg-black/20 rounded-xl p-4 border border-white/5 mb-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            <FlagAvatar country={war.attacker} borderColor="border-red-500/50" />
            <div className="text-center">
              <p className="text-white font-bold text-sm leading-tight">{war.attacker?.name}</p>
              <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Atacante</p>
            </div>
          </div>

          <div className="flex flex-col items-center px-4">
            <Swords className="text-white/20 mb-1" size={24} />
            <span className="text-white/30 text-[10px] font-black italic">VS</span>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <FlagAvatar country={war.defender} borderColor="border-blue-500/50" />
            <div className="text-center">
              <p className="text-white font-bold text-sm leading-tight">{war.defender?.name}</p>
              <p className="text-blue-400 text-[10px] uppercase font-bold tracking-wider mt-0.5">Defensor</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-white/50 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 rounded-lg mb-4"
        >
          <Users size={14} /> 
          {isExpanded ? 'Ocultar Aliados' : `Ver Aliados (${war.participants?.length || 0})`}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isExpanded && (
          <div className="bg-black/40 rounded-xl p-3 border border-white/5 mb-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 border-r border-white/10 pr-3">
                <p className="text-red-400/80 text-[10px] font-bold uppercase mb-2">Aliados do Atacante</p>
                {attParticipants.map((ally: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-red-500/30">
                      <FlagAvatar country={ally.country} borderColor="border-transparent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white/90 text-[11px] font-semibold truncate">{ally.country?.name}</p>
                      <p className="text-green-400/80 text-[10px]">{formatNumber(ally.damage_dealt || 0)} dano</p>
                    </div>
                  </div>
                ))}
                {attParticipants.length === 0 && <p className="text-white/20 text-[10px] italic">Nenhum</p>}
              </div>

              <div className="space-y-2 pl-1">
                <p className="text-blue-400/80 text-[10px] font-bold uppercase mb-2">Aliados do Defensor</p>
                {defParticipants.map((ally: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-blue-500/30">
                      <FlagAvatar country={ally.country} borderColor="border-transparent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white/90 text-[11px] font-semibold truncate">{ally.country?.name}</p>
                      <p className="text-green-400/80 text-[10px]">{formatNumber(ally.damage_dealt || 0)} dano</p>
                    </div>
                  </div>
                ))}
                {defParticipants.length === 0 && <p className="text-white/20 text-[10px] italic">Nenhum</p>}
              </div>
            </div>
          </div>
        )}

        {canAttack ? (
          <>
            {enemyProposedPeace && (
              <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                <p className="text-yellow-400 font-bold text-sm mb-2">🕊️ O inimigo propôs PAZ!</p>
                <div className="flex gap-2">
                  <button onClick={onAcceptPeace} disabled={peaceLoading} className="flex-1 bg-green-600 text-white text-xs font-bold py-2 rounded-lg">ACEITAR</button>
                  <button onClick={onRejectPeace} disabled={peaceLoading} className="flex-1 bg-red-600 text-white text-xs font-bold py-2 rounded-lg">RECUSAR</button>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 mt-2">
              <button onClick={onAttack} className="flex-1 bg-gradient-to-r from-red-700 to-red-500 text-white font-black py-3 rounded-xl shadow-lg flex items-center justify-center gap-2">
                <Swords size={18} /> Atacar
              </button>
              
              {canProposePeace ? (
                <button onClick={onProposePeace} disabled={iProposedPeace || enemyProposedPeace || peaceLoading} className="flex-1 bg-white/5 border border-white/10 disabled:opacity-30 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                  <Check size={18} /> {iProposedPeace ? '⏳ Enviado' : enemyProposedPeace ? '⚠️ Responder' : '🕊️ Propor Paz'}
                </button>
              ) : (
                <button onClick={onLeaveWar} disabled={peaceLoading} className="flex-1 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-red-200 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <X size={18} /> Sair da Guerra
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-white/40 text-[10px] text-center uppercase mb-1 flex items-center justify-center gap-1">
              <Landmark size={12} /> Requer Aprovação do Parlamento
            </p>
            <div className="flex gap-2">
              <button onClick={onJoinAttacker} disabled={joining} className="flex-1 bg-red-900/40 hover:bg-red-800/60 border border-red-500/30 text-red-200 font-bold py-2.5 rounded-xl text-xs flex flex-col items-center justify-center disabled:opacity-50">
                <span>Intervir pelo Atacante</span>
              </button>
              <button onClick={onJoinDefender} disabled={joining} className="flex-1 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-500/30 text-blue-200 font-bold py-2.5 rounded-xl text-xs flex flex-col items-center justify-center disabled:opacity-50">
                <span>Intervir pelo Defensor</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}