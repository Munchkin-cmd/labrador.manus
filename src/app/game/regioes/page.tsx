'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase/client'
import { MapPin, Building2, Plus, Mountain, Trees, Droplets, Wind } from 'lucide-react'
import Link from 'next/link'

export default function RegionsPage() {
  const { country } = useAuthStore()
  const [regions, setRegions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRegions() {
      if (!country?.id) return
      
      // ✅ CORREÇÃO: Busca os dados da tabela 'buildings' junto com a região para calcular o total exato
      const { data, error } = await supabase
        .from('regions')
        .select('*, buildings(quantity)')
        .eq('country_id', country.id)
        .order('name')

      if (error) {
        console.error('Erro ao buscar regiões:', error)
      } else {
        setRegions(data || [])
      }
      setLoading(false)
    }
    fetchRegions()
  }, [country?.id])

  if (loading) return <div className="flex h-full items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>

  const getTerrainIcon = (terrain: string) => {
    switch(terrain?.toLowerCase()) {
      case 'planicie': return <Trees size={20} className="text-green-400" />
      case 'orogenico': return <Mountain size={20} className="text-gray-400" />
      case 'anfibio': return <Droplets size={20} className="text-blue-400" />
      case 'extremista': return <Wind size={20} className="text-yellow-400" />
      default: return <MapPin size={20} className="text-white/50" />
    }
  }

  // Imagem padrão caso o jogador não tenha colocado nenhuma
  const DEFAULT_BG = 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=1000&auto=format&fit=crop'

  return (
    <div className="flex flex-col gap-6 pb-24 pt-68 max-w-5xl mx-auto w-full px-4">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <MapPin className="text-primary" /> Regiões
          </h1>
          <p className="text-white/50 text-sm mt-1">Gerencie seus territórios e construções.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {regions.map(region => {
          // ✅ CORREÇÃO: Soma a quantidade real de prédios daquela região
          const realBuildingCount = region.buildings?.reduce((acc: number, b: any) => acc + (b.quantity || 1), 0) || 0

          return (
            <Link key={region.id} href={`/game/regiao/${region.id}`}>
              <div className="relative bg-surface-card border border-surface-border rounded-xl h-48 shadow-lg flex flex-col overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group">
                
                {/* Imagem de Fundo */}
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundImage: `url(${region.image_url || DEFAULT_BG})` }}
                />
                {/* Degradê escuro para o texto ficar legível */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* Conteúdo do Card */}
                <div className="relative z-10 p-5 flex flex-col h-full justify-end">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-black text-xl drop-shadow-md truncate pr-2">{region.name}</h3>
                    <div className="bg-black/50 backdrop-blur-sm p-1.5 rounded-md border border-white/10">
                      {getTerrainIcon(region.terrain)}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 text-[10px] font-mono font-bold text-white/70 uppercase tracking-wider">
                    <span className="bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-white/10 flex items-center gap-1">
                      <Building2 size={12} /> {realBuildingCount} Prédios
                    </span>
                    <span className="bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-white/10 capitalize">
                      {region.terrain}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}