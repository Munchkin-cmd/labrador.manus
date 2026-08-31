import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface WorldStats {
  total_countries: number
  active_countries: number
  total_regions: number
  total_buildings: number
  total_money: number
  total_population: number
}

export function useWorldStats() {
  const [stats, setStats] = useState<WorldStats | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef(false)

  const fetchStats = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)

    try {
      // 🔥 CORREÇÃO: Busca TODOS os edifícios sem filtro de coluna inexistente
      // (Você já desativou o RLS, então consegue ler todos)
      const [countries, regions, buildings, economy] = await Promise.all([
        supabase.from('countries').select('id, is_active, total_regions'),
        supabase.from('regions').select('id'),
        supabase.from('buildings').select('quantity, is_active, is_built'), // Busca as colunas que existem
        supabase.from('economy').select('money, population'),
      ])

      // 🔥 Soma os edifícios de forma segura (ignora null/undefined)
      const totalBuildings = (buildings.data ?? []).reduce((sum, b) => {
        return sum + (Number(b.quantity) || 0) // Se quantity for null, vira 0
      }, 0)

      const totalMoney = (economy.data ?? []).reduce((s, e) => s + (Number(e.money) || 0), 0)
      const totalPop   = (economy.data ?? []).reduce((s, e) => s + (Number(e.population) || 0), 0)

      // 🔥 Se você quiser contar apenas edifícios construídos, faça o filtro AQUI no JS:
      // const builtBuildings = (buildings.data ?? []).filter(b => b.is_built === true)
      // const totalBuildings = builtBuildings.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0)

      setStats({
        total_countries:  (countries.data ?? []).length,
        active_countries: (countries.data ?? []).filter(c => c.is_active).length,
        total_regions:    (regions.data ?? []).length,
        total_buildings:  totalBuildings, // Agora soma tudo!
        total_money:      totalMoney,
        total_population: totalPop,
      })
    } catch (err) {
      console.error('Erro ao buscar estatísticas mundiais:', err)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading }
}