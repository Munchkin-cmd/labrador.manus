'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useConfiguracoes } from '@/hooks/useMenu'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import { 
  Loader2, Upload, X, Plus, AlertTriangle, Palette, 
  ChevronLeft, ChevronRight, Music, Coins, 
  Dog, BookOpen, Shield 
} from 'lucide-react'
import { ColorPickerModal } from '@/components/ColorPickerModal'

// ✅ Interface para evitar o uso de "as any" nos novos campos
interface ExtendedCountryData {
  biography?: string | null
  currency_logo_url?: string | null
  official_animal?: string | null
  animal_image_url?: string | null
  anthem_name?: string | null
  anthem_audio_url?: string | null
  military_banner_url?: string | null
  color?: string | null
  motto?: string | null
  leader_name?: string | null
  leader_title?: string | null
  religion?: string | null
  language?: string | null
  state_structure?: string | null
  currency?: string | null
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { user, country } = useAuthStore()
  
  const { data, profile, loading, saving, saveCountry, saveProfile, abandonCountry } = useConfiguracoes()

  // ─── ESTADOS DOS CAMPOS GERAIS ──────────────────────────────
  const [motto, setMotto]               = useState('')
  const [leaderName, setLeaderName]     = useState('')
  const [leaderTitle, setLeaderTitle]   = useState('')
  const [religion, setReligion]         = useState('')
  const [language, setLanguage]         = useState('')
  const [stateStructure, setStructure]  = useState('')
  const [feedback, setFeedback]         = useState('')
  const [pwNew, setPwNew]               = useState('')
  const [pwMsg, setPwMsg]               = useState('')
  
  // ─── NOVOS CAMPOS ───────────────────────────────────────────
  const [biography, setBiography]       = useState('')
  
  // Moeda
  const [currencyName, setCurrencyName] = useState('')
  const [currencyLogo, setCurrencyLogo] = useState('')
  const [uploadingCurrency, setUploadingCurrency] = useState(false)

  // Animal
  const [animalName, setAnimalName]     = useState('')
  const [animalImage, setAnimalImage]   = useState('')
  const [uploadingAnimal, setUploadingAnimal] = useState(false)

  // Hino
  const [anthemName, setAnthemName]     = useState('')
  const [anthemAudio, setAnthemAudio]   = useState('')
  const [uploadingAnthem, setUploadingAnthem] = useState(false)

  // Banners e Mídias
  const [flagUrl, setFlagUrl]           = useState('')
  const [leaderUrl, setLeaderUrl]       = useState('')
  const [militaryBanner, setMilitaryBanner] = useState('')
  const [bannerUrls, setBannerUrls]     = useState<string[]>([])
  
  // Uploads de Imagem Padrão
  const [uploadingFlag, setUploadingFlag] = useState(false)
  const [uploadingLeader, setUploadingLeader] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingMilBanner, setUploadingMilBanner] = useState(false)
  
  // Refs de Inputs
  const flagInputRef = useRef<HTMLInputElement>(null)
  const leaderInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const milBannerInputRef = useRef<HTMLInputElement>(null)
  const currencyInputRef = useRef<HTMLInputElement>(null)
  const animalInputRef = useRef<HTMLInputElement>(null)
  const anthemInputRef = useRef<HTMLInputElement>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isColorModalOpen, setIsColorModalOpen] = useState(false)

  useEffect(() => {
    if (data) {
      const extData = data as unknown as ExtendedCountryData
      
      setMotto(extData.motto ?? '')
      setLeaderName(extData.leader_name ?? '')
      setLeaderTitle(extData.leader_title ?? 'Presidente')
      setReligion(extData.religion ?? '')
      setLanguage(extData.language ?? '')
      setStructure(extData.state_structure ?? '')
      
      // Campos mapeados com a Interface
      setBiography(extData.biography ?? '')
      setCurrencyName(extData.currency ?? '')
      setCurrencyLogo(extData.currency_logo_url ?? '')
      setAnimalName(extData.official_animal ?? '')
      setAnimalImage(extData.animal_image_url ?? '')
      setAnthemName(extData.anthem_name ?? '')
      setAnthemAudio(extData.anthem_audio_url ?? '')
      setMilitaryBanner(extData.military_banner_url ?? '')
    }
    if (profile) {
      setFlagUrl(profile.flag_url ?? '')
      setLeaderUrl(profile.leader_url ?? '')
      setBannerUrls(profile.banner_urls ?? [])
    }
  }, [data, profile])

  // ─── UPLOAD GENÉRICO ────────────────────────────────────────
  async function handleUpload(
    file: File,
    bucket: 'flags' | 'leaders' | 'banners' | 'media',
    onSuccess: (url: string) => void,
    setUploading: (val: boolean) => void
  ) {
    if (!file || !country?.id) return
    setUploading(true)
    setFeedback('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${country.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName)
      if (!urlData?.publicUrl) throw new Error('Erro ao obter URL pública')

      onSuccess(urlData.publicUrl)
      setFeedback(`✅ Arquivo enviado com sucesso!`)
    } catch (err: any) {
      setFeedback(`❌ Erro no upload: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  // ─── UPLOAD MÚLTIPLO ────────────────────────────────────────
  async function handleMultiBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0 || !country?.id) return
    
    setUploadingBanner(true)
    const newUrls: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${country.id}_banner_${Date.now()}_${i}.${fileExt}`

      const { error } = await supabase.storage.from('banners').upload(fileName, file, { upsert: true })
      
      if (!error) {
        const { data: urlData } = supabase.storage.from('banners').getPublicUrl(fileName)
        if (urlData?.publicUrl) newUrls.push(urlData.publicUrl)
      }
    }

    setBannerUrls(prev => [...prev, ...newUrls])
    setUploadingBanner(false)
    if (e.target) e.target.value = ''
  }

  // ─── MOVER BANNER ───────────────────────────────────────────
  const moveBanner = (index: number, direction: 'left' | 'right') => {
    const newArr = [...bannerUrls]
    if (direction === 'left' && index > 0) {
      [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]]
    } else if (direction === 'right' && index < newArr.length - 1) {
      [newArr[index + 1], newArr[index]] = [newArr[index], newArr[index + 1]]
    }
    setBannerUrls(newArr)
  }

  // ─── SALVAR TUDO ────────────────────────────────────────────
  async function handleSave() {
    setFeedback('')
    const [r1, r2] = await Promise.all([
      saveCountry({ 
        motto, 
        leader_name: leaderName, 
        leader_title: leaderTitle, 
        religion, 
        language, 
        state_structure: stateStructure,
        biography,
        currency: currencyName,
        currency_logo_url: currencyLogo,
        official_animal: animalName,
        animal_image_url: animalImage,
        anthem_name: anthemName,
        anthem_audio_url: anthemAudio,
        military_banner_url: militaryBanner
      }),
      saveProfile({ 
        flag_url: flagUrl || null, 
        leader_url: leaderUrl || null,
        banner_urls: bannerUrls,
      }),
    ])
    
    setFeedback(r1.success && r2.success ? '✅ Todas as alterações salvas!' : '❌ Erro ao salvar')
    router.refresh()
    setTimeout(() => setFeedback(''), 4000)
  }

  async function handleChangePassword() {
    setPwMsg('')
    if (!pwNew || pwNew.length < 6) { setPwMsg('Nova senha precisa ter ao menos 6 caracteres'); return }
    const { error } = await supabase.auth.updateUser({ password: pwNew })
    setPwMsg(error ? '❌ ' + error.message : '✅ Senha alterada com sucesso!')
    setPwNew('')
    setTimeout(() => setPwMsg(''), 4000)
  }

  async function handleDeleteCountry() {
    setDeleting(true)
    const res = await abandonCountry()
    if (res.success) {
      await supabase.auth.signOut()
      window.location.href = '/auth/login'
    } else {
      alert(res.error || 'Erro ao excluir o país')
      setDeleting(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className="flex flex-col gap-6 pb-10 min-h-screen w-full max-w-4xl mx-auto px-4 sm:px-6 pt-68">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-2 pl-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          <p className="text-xs font-bold tracking-widest text-white uppercase font-mono">Configurações</p>
        </div>
      </div>

      {/* LÍDER */}
      <Section title="👤 LÍDER">
        <Field label="Nome do Líder">
          <input value={leaderName} onChange={e => setLeaderName(e.target.value)} className="input-field" placeholder="Nome do líder" />
        </Field>
        <Field label="Título">
          <input value={leaderTitle} onChange={e => setLeaderTitle(e.target.value)} className="input-field" placeholder="Ex: Presidente, Rei, etc." />
        </Field>
        <UploadField 
          label="Foto do Líder" 
          value={leaderUrl} 
          onClear={() => setLeaderUrl('')} 
          onUpload={() => leaderInputRef.current?.click()} 
          uploading={uploadingLeader} 
          inputRef={leaderInputRef} 
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file, 'leaders', setLeaderUrl, setUploadingLeader)
          }}
        />
      </Section>

      {/* PAÍS */}
      <Section title="🏛️ PAÍS">
        <Field label="Lema Nacional">
          <input value={motto} onChange={e => setMotto(e.target.value)} className="input-field" placeholder="Ex: Ordem e Progresso" maxLength={100} />
        </Field>

        <Field label="Biografia da Nação">
          <textarea 
            value={biography} 
            onChange={e => setBiography(e.target.value)} 
            className="input-field min-h-[100px] resize-y" 
            placeholder="Conte a história do seu país para o mundo..." 
          />
        </Field>

        <UploadField 
          label="Bandeira" 
          value={flagUrl} 
          onClear={() => setFlagUrl('')} 
          onUpload={() => flagInputRef.current?.click()} 
          uploading={uploadingFlag} 
          inputRef={flagInputRef} 
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file, 'flags', setFlagUrl, setUploadingFlag)
          }}
        />

        <Field label="Cor do Estado no Mapa">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg border border-surface-border shadow-inner flex-shrink-0" style={{ backgroundColor: data?.color || '#3b82f6' }} />
            <button onClick={() => setIsColorModalOpen(true)} className="flex-1 bg-surface-input border border-surface-border hover:bg-surface-border/50 rounded-lg py-2.5 px-4 text-white/80 text-xs font-bold font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
              <Palette size={16} /> Alterar Cor
            </button>
          </div>
        </Field>

        <Field label="Estrutura de Estado">
          <input value={stateStructure} onChange={e => setStructure(e.target.value)} className="input-field" placeholder="Ex: Democracia, Monarquia, etc." />
        </Field>
        <Field label="Religião Oficial">
          <input value={religion} onChange={e => setReligion(e.target.value)} className="input-field" placeholder="Ex: Cristianismo, Sem religião, etc." />
        </Field>
        <Field label="Idioma">
          <input value={language} onChange={e => setLanguage(e.target.value)} className="input-field" placeholder="Ex: Português, Inglês, etc." />
        </Field>
      </Section>

      {/* SÍMBOLOS NACIONAIS */}
      <Section title="🦅 SÍMBOLOS NACIONAIS">
        
        {/* Moeda */}
        <div className="flex flex-col sm:flex-row gap-3 bg-surface-input p-3 rounded-lg border border-surface-border">
          <div className="flex-1">
            <Field label="Moeda">
              <input value={currencyName} onChange={e => setCurrencyName(e.target.value)} className="input-field" placeholder="Ex: Real (R$)" />
            </Field>
          </div>
          <div className="sm:w-1/3">
             <UploadField 
                label="Símbolo (Logo)" 
                value={currencyLogo} 
                onClear={() => setCurrencyLogo('')} 
                onUpload={() => currencyInputRef.current?.click()} 
                uploading={uploadingCurrency} 
                inputRef={currencyInputRef} 
                icon={<Coins size={16} />}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file, 'media', setCurrencyLogo, setUploadingCurrency)
                }}
              />
          </div>
        </div>

        {/* Animal */}
        <div className="flex flex-col sm:flex-row gap-3 bg-surface-input p-3 rounded-lg border border-surface-border">
          <div className="flex-1">
            <Field label="Animal Nacional">
              <input value={animalName} onChange={e => setAnimalName(e.target.value)} className="input-field" placeholder="Ex: Onça-pintada" />
            </Field>
          </div>
          <div className="sm:w-1/3">
             <UploadField 
                label="Foto do Animal" 
                value={animalImage} 
                onClear={() => setAnimalImage('')} 
                onUpload={() => animalInputRef.current?.click()} 
                uploading={uploadingAnimal} 
                inputRef={animalInputRef} 
                icon={<Dog size={16} />}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file, 'media', setAnimalImage, setUploadingAnimal)
                }}
              />
          </div>
        </div>

        {/* Hino */}
        <div className="flex flex-col sm:flex-row gap-3 bg-surface-input p-3 rounded-lg border border-surface-border">
          <div className="flex-1">
            <Field label="Nome do Hino">
              <input value={anthemName} onChange={e => setAnthemName(e.target.value)} className="input-field" placeholder="Ex: Hino da Independência" />
            </Field>
          </div>
          <div className="sm:w-1/3">
             <UploadField 
                label="Áudio do Hino" 
                value={anthemAudio} 
                onClear={() => setAnthemAudio('')} 
                onUpload={() => anthemInputRef.current?.click()} 
                uploading={uploadingAnthem} 
                inputRef={anthemInputRef} 
                icon={<Music size={16} />}
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file, 'media', setAnthemAudio, setUploadingAnthem)
                }}
              />
          </div>
        </div>

      </Section>

      {/* BANNERS DO PAÍS */}
      <Section title="🎨 BANNERS DO PAÍS">
        <p className="text-white/50 text-[10px] font-mono uppercase tracking-widest mb-2">
          Você pode selecionar várias fotos de uma vez. Use as setas para mudar a ordem.
        </p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
          {bannerUrls.map((imgUrl, i) => (
            <div key={i} className="relative aspect-video bg-surface-input border border-surface-border rounded-lg overflow-hidden group">
              <img src={imgUrl} alt={`Banner ${i+1}`} className="w-full h-full object-cover" />
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-2">
                <button onClick={() => moveBanner(i, 'left')} disabled={i === 0} className="p-1.5 bg-white/20 hover:bg-primary rounded text-white disabled:opacity-30 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setBannerUrls(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded text-white transition-colors">
                  <X size={16} />
                </button>
                <button onClick={() => moveBanner(i, 'right')} disabled={i === bannerUrls.length - 1} className="p-1.5 bg-white/20 hover:bg-primary rounded text-white disabled:opacity-30 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
              
              <span className="absolute top-1 left-1 bg-black/80 text-[10px] font-bold text-white px-1.5 py-0.5 rounded">
                {i + 1}
              </span>
            </div>
          ))}

          <div 
            onClick={() => !uploadingBanner && bannerInputRef.current?.click()}
            className="relative aspect-video bg-surface-card border border-surface-border border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-surface-input transition-colors"
          >
            {uploadingBanner ? (
              <Loader2 className="animate-spin text-primary" size={24} />
            ) : (
              <>
                <Plus className="text-white/40 mb-1" size={24} />
                <span className="text-[9px] font-bold font-mono tracking-widest text-white/40 uppercase">Adicionar Fotos</span>
              </>
            )}
          </div>
        </div>

        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleMultiBannerUpload}
        />
      </Section>

      {/* BANNER MILITAR */}
      <Section title="⚔️ BANNER MILITAR">
        <p className="text-white/50 text-[10px] font-mono uppercase tracking-widest mb-2">
          Imagem que aparecerá no topo da página do Exército.
        </p>
        <UploadField 
          label="Banner do Exército" 
          value={militaryBanner} 
          onClear={() => setMilitaryBanner('')} 
          onUpload={() => milBannerInputRef.current?.click()} 
          uploading={uploadingMilBanner} 
          inputRef={milBannerInputRef} 
          icon={<Shield size={16} />}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file, 'banners', setMilitaryBanner, setUploadingMilBanner)
          }}
        />
      </Section>

      {feedback && (
        <p className={`text-xs font-mono text-center font-bold p-3 rounded bg-surface-input ${feedback.includes('✅') ? 'text-green-500' : 'text-red-500'}`}>
          {feedback}
        </p>
      )}

      <button onClick={handleSave} disabled={saving} className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold font-mono uppercase tracking-wider py-3.5 rounded-lg transition-colors shadow-lg shadow-primary/20 text-sm mt-2">
        {saving ? 'Salvando...' : 'Salvar Todas as Alterações'}
      </button>

      {/* SENHA */}
      <Section title="🔐 ALTERAR SENHA">
        <Field label="Nova Senha">
          <input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} className="input-field" placeholder="Mínimo 6 caracteres" />
        </Field>
        {pwMsg && <p className={`text-xs font-mono mt-1 ${pwMsg.includes('✅') ? 'text-green-500' : 'text-red-500'}`}>{pwMsg}</p>}
        <button onClick={handleChangePassword} className="w-full mt-2 bg-surface-input border border-surface-border hover:bg-surface-border/50 text-white font-bold font-mono uppercase tracking-wider py-2.5 rounded-lg transition-colors text-xs">
          Alterar Senha
        </button>
      </Section>

      <Section title="📧 CONTA">
        <div className="flex justify-between items-center">
          <span className="text-white/50 text-[10px] font-mono uppercase tracking-widest">Email</span>
          <span className="text-white/80 text-xs font-mono">{user?.email}</span>
        </div>
      </Section>

      <Section title="⚠️ ZONA DE PERIGO">
        <p className="text-white/60 text-[10px] font-mono leading-relaxed mb-3">
          Ao excluir seu país, todos os seus edifícios, economia, leis e histórico serão apagados permanentemente.
        </p>
        <button onClick={() => setShowDeleteModal(true)} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold font-mono uppercase tracking-wider py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs">
          <AlertTriangle size={16} /> Excluir País e Sair
        </button>
      </Section>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-xl p-6 max-w-sm w-full text-center shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <h3 className="text-white font-bold text-lg mb-2 uppercase tracking-wider">Tem certeza absoluta?</h3>
            <p className="text-white/60 text-xs font-mono mb-6 leading-relaxed">
              Essa ação não pode ser desfeita. Você perderá todo o progresso.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="flex-1 bg-surface-input border border-surface-border hover:bg-surface-border/50 text-white font-bold font-mono uppercase tracking-wider py-2.5 rounded-lg text-xs transition-colors">
                Cancelar
              </button>
              <button onClick={handleDeleteCountry} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold font-mono uppercase tracking-wider py-2.5 rounded-lg text-xs transition-colors disabled:opacity-50 shadow-lg shadow-red-900/50">
                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ColorPickerModal 
        isOpen={isColorModalOpen}
        onClose={() => {
          setIsColorModalOpen(false)
          router.refresh()
        }}
        currentColor={data?.color || null}
      />
    </div>
  )
}

// ─── COMPONENTES AUXILIARES ──────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 pl-1 mt-4">
        <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0" />
        <p className="text-xs font-bold tracking-widest text-white uppercase font-mono">{title}</p>
      </div>
      <div className="bg-surface-card border border-surface-border rounded-lg p-4 sm:p-5 shadow-lg flex flex-col gap-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-white/50 text-[10px] font-bold font-mono uppercase tracking-widest">{label}</label>
      {children}
    </div>
  )
}

function UploadField({ 
  label, value, onClear, onUpload, uploading, inputRef, onChange, icon, accept = "image/*" 
}: { 
  label: string, value: string, onClear: () => void, onUpload: () => void, uploading: boolean, inputRef: React.RefObject<HTMLInputElement>, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, icon?: React.ReactNode, accept?: string 
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <button
          onClick={onUpload}
          disabled={uploading}
          className="flex-1 bg-surface-input border border-surface-border hover:bg-surface-border/50 rounded-lg py-2.5 px-4 text-white/80 text-xs font-bold font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="animate-spin" size={16} /> : (icon || <Upload size={16} />)}
          {uploading ? 'Enviando...' : 'Fazer Upload'}
        </button>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onChange} />
        
        {value && (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-surface-border flex-shrink-0 bg-surface-input flex items-center justify-center">
            {accept.includes('image') ? (
              <img src={value} alt={label} className="w-full h-full object-cover" />
            ) : (
              <Music size={20} className="text-primary" />
            )}
            <button onClick={onClear} className="absolute top-0 right-0 bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors">
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    </Field>
  )
}

function Loading() {
  return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
}