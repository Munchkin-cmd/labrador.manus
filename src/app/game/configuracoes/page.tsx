'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useConfiguracoes } from '@/hooks/useMenu'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Upload, X } from 'lucide-react'

// ─── REMOVIDOS: LEADER_TITLES, RELIGIONS, LANGUAGES, STATE_STRUCTURES (não são mais usados)

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { user, country } = useAuthStore()
  const { data, profile, loading, saving, saveCountry, saveProfile } = useConfiguracoes()

  // ─── ESTADOS DOS CAMPOS ──────────────────────────────────────
  const [motto, setMotto]               = useState('')
  const [leaderName, setLeaderName]     = useState('')
  const [leaderTitle, setLeaderTitle]   = useState('')
  const [religion, setReligion]         = useState('')
  const [currency, setCurrency]         = useState('')
  const [language, setLanguage]         = useState('')
  const [stateStructure, setStructure]  = useState('')
  const [feedback, setFeedback]         = useState('')
  const [pwCurrent, setPwCurrent]       = useState('')
  const [pwNew, setPwNew]               = useState('')
  const [pwMsg, setPwMsg]               = useState('')

  // ─── UPLOAD DE IMAGENS ──────────────────────────────────────
  const [flagUrl, setFlagUrl]           = useState('')
  const [leaderUrl, setLeaderUrl]       = useState('')
  const [bannerUrls, setBannerUrls]     = useState<string[]>([])
  
  const [uploadingFlag, setUploadingFlag] = useState(false)
  const [uploadingLeader, setUploadingLeader] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [activeBannerIndex, setActiveBannerIndex] = useState<number | null>(null)
  
  const flagInputRef = useRef<HTMLInputElement>(null)
  const leaderInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (data) {
      setMotto(data.motto ?? '')
      setLeaderName(data.leader_name ?? '')
      setLeaderTitle(data.leader_title ?? 'Presidente')
      setReligion(data.religion ?? '')
      setCurrency(data.currency ?? '')
      setLanguage(data.language ?? '')
      setStructure(data.state_structure ?? '')
    }
    if (profile) {
      setFlagUrl(profile.flag_url ?? '')
      setLeaderUrl(profile.leader_url ?? '')
      setBannerUrls(profile.banner_urls ?? [])
    }
  }, [data, profile])

  // ─── FUNÇÃO GENÉRICA DE UPLOAD ─────────────────────────────
  async function handleUpload(
    file: File,
    bucket: 'flags' | 'leaders' | 'banners',
    onSuccess: (url: string) => void,
    setUploading: (val: boolean) => void
  ) {
    if (!file || !country?.id) return
    setUploading(true)
    setFeedback('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${country.id}_${Date.now()}.${fileExt}`
      const filePath = fileName

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      if (!urlData?.publicUrl) throw new Error('Erro ao obter URL pública')

      onSuccess(urlData.publicUrl)
      setFeedback(`✅ Imagem enviada com sucesso!`)
    } catch (err: any) {
      setFeedback(`❌ Erro no upload: ${err.message}`)
    } finally {
      setUploading(false)
      setActiveBannerIndex(null)
    }
  }

  // ─── SALVAR TUDO ────────────────────────────────────────────
  async function handleSave() {
    setFeedback('')
    const [r1, r2] = await Promise.all([
      saveCountry({ motto, leader_name: leaderName, leader_title: leaderTitle, religion, currency, language, state_structure: stateStructure }),
      saveProfile({ 
        flag_url: flagUrl || null, 
        leader_url: leaderUrl || null,
        banner_urls: bannerUrls,
      }),
    ])
    setFeedback(r1.success && r2.success ? '✅ Alterações salvas!' : '❌ Erro ao salvar')
    
    router.refresh()
    
    setTimeout(() => setFeedback(''), 4000)
  }

  // ─── SALVAR APENAS OS BANNERS ──────────────────────────────
  async function handleSaveBanners() {
    setFeedback('')
    const res = await saveProfile({ banner_urls: bannerUrls })
    setFeedback(res.success ? '✅ Banners salvos com sucesso!' : '❌ Erro ao salvar banners')
    
    router.refresh()
    
    setTimeout(() => setFeedback(''), 4000)
  }

  async function handleChangePassword() {
    setPwMsg('')
    if (!pwNew || pwNew.length < 6) { setPwMsg('Nova senha precisa ter ao menos 6 caracteres'); return }
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    setPwMsg(error ? '❌ ' + error.message : '✅ Senha alterada com sucesso!')
    setPwCurrent(''); setPwNew('')
    setTimeout(() => setPwMsg(''), 4000)
  }

  if (loading) return <Loading />

  return (
    <div className="flex flex-col gap-5 pb-6 p-4">
      <p className="text-xs font-bold tracking-widest text-white/40 uppercase">CONFIGURAÇÕES</p>

      {/* Líder */}
      <Section title="👤 LÍDER">
        <Field label="Nome do Líder">
          <input value={leaderName} onChange={e => setLeaderName(e.target.value)} className="input-field" placeholder="Nome do líder" />
        </Field>
        <Field label="Título">
          {/* ✅ Substituído select por input de texto */}
          <input value={leaderTitle} onChange={e => setLeaderTitle(e.target.value)} className="input-field" placeholder="Ex: Presidente, Rei, etc." />
        </Field>

        {/* Upload da Foto do Líder */}
        <Field label="Foto do Líder">
          <div className="flex items-center gap-3">
            <button
              onClick={() => leaderInputRef.current?.click()}
              disabled={uploadingLeader}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 px-4 text-white/70 text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploadingLeader ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              {uploadingLeader ? 'Enviando...' : 'Selecionar Imagem'}
            </button>
            <input
              ref={leaderInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file, 'leaders', setLeaderUrl, setUploadingLeader)
              }}
            />
            {leaderUrl && (
              <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-black">
                <img src={leaderUrl} alt="Líder" className="w-full h-full object-cover" />
                <button
                  onClick={() => setLeaderUrl('')}
                  className="absolute top-0 right-0 bg-black/60 text-white rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </Field>
      </Section>

      {/* País */}
      <Section title="🏛️ PAÍS">
        <Field label="Lema Nacional">
          <input value={motto} onChange={e => setMotto(e.target.value)} className="input-field" placeholder="Ex: Ordem e Progresso" maxLength={100} />
        </Field>

        {/* Upload da Bandeira */}
        <Field label="Bandeira">
          <div className="flex items-center gap-3">
            <button
              onClick={() => flagInputRef.current?.click()}
              disabled={uploadingFlag}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 px-4 text-white/70 text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploadingFlag ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              {uploadingFlag ? 'Enviando...' : 'Selecionar Imagem'}
            </button>
            <input
              ref={flagInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file, 'flags', setFlagUrl, setUploadingFlag)
              }}
            />
            {flagUrl && (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-black">
                <img src={flagUrl} alt="Bandeira" className="w-full h-full object-cover" />
                <button
                  onClick={() => setFlagUrl('')}
                  className="absolute top-0 right-0 bg-black/60 text-white rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </Field>

        <Field label="Moeda Nacional">
          <input value={currency} onChange={e => setCurrency(e.target.value)} className="input-field" placeholder="Ex: Real (R$)" />
        </Field>
        <Field label="Estrutura de Estado">
          {/* ✅ Substituído select por input de texto */}
          <input value={stateStructure} onChange={e => setStructure(e.target.value)} className="input-field" placeholder="Ex: Democracia, Monarquia, etc." />
        </Field>
        <Field label="Religião Oficial">
          {/* ✅ Substituído select por input de texto */}
          <input value={religion} onChange={e => setReligion(e.target.value)} className="input-field" placeholder="Ex: Cristianismo, Sem religião, etc." />
        </Field>
        <Field label="Idioma">
          {/* ✅ Substituído select por input de texto */}
          <input value={language} onChange={e => setLanguage(e.target.value)} className="input-field" placeholder="Ex: Português, Inglês, etc." />
        </Field>
      </Section>

      {/* ─── 13 BANNERS (COM BOTÃO SALVAR BANNERS) ────────────── */}
      <Section title="🎨 BANNERS DO PAÍS (13 FOTOS)">
        <p className="text-white/40 text-xs mb-2">
          Clique em um quadrado para enviar uma foto para aquela posição.
        </p>
        
        <div className="grid grid-cols-3 gap-2 mt-2">
          {Array.from({ length: 13 }).map((_, i) => {
            const imgUrl = bannerUrls[i] || null
            return (
              <div 
                key={i} 
                className="relative aspect-square bg-black/40 border border-white/10 rounded-lg overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  if (!imgUrl) {
                    setActiveBannerIndex(i)
                    bannerInputRef.current?.click()
                  }
                }}
              >
                {imgUrl ? (
                  <>
                    <img src={imgUrl} alt={`Banner ${i+1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const newArr = [...bannerUrls]
                        newArr[i] = ''
                        setBannerUrls(newArr)
                      }}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <span className="text-white/20 text-xs">#{i+1}</span>
                )}
              </div>
            )
          })}
        </div>

        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file && activeBannerIndex !== null) {
              handleUpload(
                file, 
                'banners', 
                (url) => {
                  const newArr = [...bannerUrls]
                  newArr[activeBannerIndex] = url
                  setBannerUrls(newArr)
                },
                setUploadingBanner
              )
            }
          }}
        />

        <div className="flex gap-3 mt-3">
          <button
            onClick={handleSaveBanners}
            disabled={saving}
            className="flex-1 bg-primary hover:bg-primary-light text-white font-semibold py-2 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            💾 SALVAR BANNERS
          </button>
        </div>
      </Section>

      {feedback && (
        <p className={`text-sm text-center ${feedback.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>{feedback}</p>
      )}

      <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
        {saving ? 'Salvando...' : 'SALVAR ALTERAÇÕES'}
      </button>

      {/* Senha */}
      <Section title="🔐 ALTERAR SENHA">
        <Field label="Nova Senha">
          <input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)}
            className="input-field" placeholder="Mínimo 6 caracteres" />
        </Field>
        {pwMsg && (
          <p className={`text-sm mt-2 ${pwMsg.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>{pwMsg}</p>
        )}
        <button onClick={handleChangePassword} className="w-full mt-3 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
          ALTERAR SENHA
        </button>
      </Section>

      {/* Email info */}
      <Section title="📧 CONTA">
        <div className="flex justify-between items-center">
          <span className="text-white/40 text-sm">Email</span>
          <span className="text-white/70 text-sm">{user?.email}</span>
        </div>
      </Section>

    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2">{title}</p>
      <div className="bg-surface-card rounded-xl p-4 flex flex-col gap-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-white/50 text-xs font-semibold">{label}</label>
      {children}
    </div>
  )
}

function Loading() {
  return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
}