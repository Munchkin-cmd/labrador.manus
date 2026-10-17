'use client'
import { useEffect, useState } from 'react'

interface LinkPreviewProps {
  url: string
  children: React.ReactNode
}

export default function LinkPreview({ url, children }: LinkPreviewProps) {
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    try {
      new URL(url)
    } catch {
      setError(true)
      setLoading(false)
      return
    }

    async function fetchPreview() {
      try {
        // Chama a sua API que acabamos de testar!
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        
        // Se não achar título, trata como erro para mostrar o link normal
        if (!data.title) throw new Error()
        
        setPreview(data)
      } catch (err) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    
    fetchPreview()
  }, [url])

  // Enquanto carrega, ou se for um link interno que não tem preview, mostra texto azul normal
  if (loading || error || !preview) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
        {children}
      </a>
    )
  }

  const domain = new URL(url).hostname.replace('www.', '')

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="block my-3 no-underline group w-full max-w-md"
    >
      <div className="border border-white/10 bg-[#1a1a2e] rounded-xl overflow-hidden hover:bg-[#252545] transition-all flex flex-col sm:flex-row shadow-lg">
        
        {/* Imagem do site */}
        {preview.images && preview.images.length > 0 && preview.images[0] && (
          <div className="w-full sm:w-40 h-40 sm:h-auto shrink-0 relative bg-black/40 border-r border-white/5">
            <img
              src={preview.images[0]}
              alt={preview.title}
              className="w-full h-full object-cover"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
        )}
        
        {/* Textos */}
        <div className="p-4 flex flex-col justify-center min-w-0">
          <p className="text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-1 truncate">
            {preview.siteName || domain}
          </p>
          <h4 className="text-white font-bold text-sm line-clamp-2 group-hover:text-blue-300 transition-colors">
            {preview.title}
          </h4>
          {preview.description && (
            <p className="text-white/50 text-xs line-clamp-2 mt-1">
              {preview.description}
            </p>
          )}
        </div>
      </div>
    </a>
  )
}