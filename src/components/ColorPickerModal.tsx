'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { X, Check, Palette } from 'lucide-react'

interface ColorPickerModalProps {
  isOpen: boolean
  onClose: () => void
  currentColor: string | null
}

// ✅ Paleta de cores predefinidas
const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', 
  '#ec4899', '#f43f5e', '#64748b', '#475569', '#334155'
]

export function ColorPickerModal({ isOpen, onClose, currentColor }: ColorPickerModalProps) {
  const { country } = useAuthStore()
  const [selectedColor, setSelectedColor] = useState(currentColor || '#3b82f6')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSelectedColor(currentColor || '#3b82f6')
      setErrorMsg('')
    }
  }, [isOpen, currentColor])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!country?.id) return
    setSaving(true)
    setErrorMsg('')

    const { error } = await supabase
      .from('countries')
      .update({ color: selectedColor })
      .eq('id', country.id)

    setSaving(false)

    if (error) {
      setErrorMsg('Erro ao salvar a cor. Tente novamente.')
      console.error(error)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface-card border border-surface-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border bg-surface-input">
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-white font-mono">Cor do Estado</h2>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <div 
              className="w-24 h-24 rounded-full shadow-lg border-4 border-white/10 mb-3 transition-colors duration-200"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="text-xs font-mono text-white/70 uppercase tracking-widest">{selectedColor}</span>
          </div>

          <div className="grid grid-cols-5 gap-3 mb-6">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-full aspect-square rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center
                  ${selectedColor === color ? 'border-white shadow-[0_0_10px_rgba(255,255,255,0.5)] scale-110' : 'border-transparent'}
                `}
                style={{ backgroundColor: color }}
              >
                {selectedColor === color && <Check size={14} className="text-white drop-shadow-md" />}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 bg-surface-input border border-surface-border p-3 rounded-lg">
            <span className="text-xs font-mono text-white/50 uppercase tracking-widest">Customizada:</span>
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-10 h-10 cursor-pointer rounded bg-transparent border-none p-0"
            />
            <input 
              type="text" 
              value={selectedColor}
              onChange={(e) => {
                const val = e.target.value
                if (val.startsWith('#') || val === '') setSelectedColor(val)
              }}
              className="flex-1 bg-black/20 border border-surface-border rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-primary uppercase"
              placeholder="#000000"
            />
          </div>

          {errorMsg && (
            <p className="text-red-400 text-xs text-center mt-4 font-mono">{errorMsg}</p>
          )}
        </div>

        <div className="flex border-t border-surface-border bg-surface-input">
          <button 
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <div className="w-px bg-surface-border" />
          <button 
            onClick={handleSave}
            disabled={saving || !selectedColor}
            className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-primary hover:text-white hover:bg-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Cor'}
          </button>
        </div>

      </div>
    </div>
  )
}