'use client'

import { useState, useEffect, useRef } from 'react'
import { WorldStats } from '@/hooks/useWorldStats'
import { CountryFull, Economy } from '@/hooks/useCountry'
import { formatMoney, formatNumber, formatPopulation } from '@/utils/format'

// ── World Stats ─────────────────────────────────────────────
interface WorldProps { stats: WorldStats }

export function WorldStatsCarousel({ stats }: WorldProps) {
  const slides = [
    [
      { label: 'Países',      value: formatNumber(stats.total_countries) },
      { label: 'Ativos',      value: formatNumber(stats.active_countries) },
      { label: 'Regiões',     value: formatNumber(stats.total_regions) },
    ],
    [
      { label: 'Edifícios',   value: formatNumber(stats.total_buildings) },
      { label: 'Dinheiro',    value: formatMoney(stats.total_money) },
      { label: 'População',   value: formatPopulation(stats.total_population) },
    ],
  ]
  return <StatsCarousel label="ESTATÍSTICAS MUNDIAIS" slides={slides} accent="text-yellow-400" />
}

// ── Country Stats ────────────────────────────────────────────
interface CountryProps { 
  country: CountryFull; 
  economy: Economy; 
  regionsCount: number;
}

export function CountryStatsCarousel({ country, economy, regionsCount }: CountryProps) {
  const slides = [
    [
      { label: 'Dinheiro',    value: formatMoney(Number(economy.money)) },
      { label: 'Confiança',   value: `${country.trust}%` },
      { label: 'Aprovação',   value: `${country.intl_approval}%` },
    ],
    [
      { label: 'Poder Pol.',  value: `${country.political_power}` },
      { label: 'Regiões',     value: formatNumber(regionsCount) }, 
      { label: 'Energia',     value: formatNumber(Number(economy.energy)) },
    ],
    [
      { label: 'Comida',      value: formatNumber(Number(economy.food)) },
      { label: 'Ouro',        value: formatNumber(Number(economy.gold)) },
      { label: 'Pop.',        value: formatPopulation(Number(economy.population)) },
    ],
    [
      { label: 'Petróleo',    value: formatNumber(Number(economy.oil)) },
      { label: 'Ferro',       value: formatNumber(Number(economy.iron)) },
      { label: 'Aço',         value: formatNumber(Number(economy.steel)) },
    ],
    [
      { label: 'Madeira',     value: formatNumber(Number(economy.wood)) },
      { label: 'Carvão',      value: formatNumber(Number(economy.coal)) },
      { label: 'Urânio',      value: formatNumber(Number(economy.uranium)) },
    ],
  ]
  return <StatsCarousel label={`🌍 ${country.name.toUpperCase()}`} slides={slides} accent="text-primary" />
}

// ── Base Carousel ────────────────────────────────────────────
interface Stat { label: string; value: string }

interface CarouselProps {
  label: string
  slides: Stat[][]
  accent: string
}

function StatsCarousel({ label, slides, accent }: CarouselProps) {
  const [current, setCurrent] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setCurrent((prev: number) => (prev + 1) % slides.length)
    }, 5000)
  }

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    startTimer()
    return () => stopTimer()
  }, [slides.length])

  const goToSlide = (index: number) => {
    setCurrent(index)
    stopTimer()
    startTimer()
  }

  const goNext = () => {
    setCurrent((prev: number) => (prev + 1) % slides.length)
    stopTimer()
    startTimer()
  }

  const goPrev = () => {
    setCurrent((prev: number) => (prev - 1 + slides.length) % slides.length)
    stopTimer()
    startTimer()
  }

  const handleSlideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const center = rect.width / 2

    if (x < center) {
      goPrev()
    } else {
      goNext()
    }
  }

  return (
    <div className="px-1">
      {/* Label Superior e Dots */}
      <div className="flex items-center justify-between mb-2 pl-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0" />
          <p className="text-[10px] font-bold tracking-widest text-white uppercase font-mono">{label}</p>
        </div>
        
        {/* Dots de navegação */}
        <div className="flex gap-1.5 pr-1">
          {slides.map((_, i: number) => (
            <button key={i} onClick={() => goToSlide(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === current ? `${accent} bg-current shadow-[0_0_8px_rgba(59,130,246,0.8)] scale-125` : 'bg-surface-border hover:bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Container do Slide (Clicável) */}
      <div
        ref={containerRef}
        onClick={handleSlideClick}
        className="relative cursor-pointer"
      >
        {/* Card sólido com borda azul e sombra */}
        <div className="bg-surface-card border border-surface-border rounded-lg p-4 grid grid-cols-3 gap-2 pointer-events-none shadow-lg transition-colors hover:border-primary/30">
          {slides[current].map((stat: Stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center text-center w-full">
              <span className={`text-sm font-black font-mono tracking-tight ${accent} drop-shadow-md`}>
                {stat.value}
              </span>
              <span className="text-white/40 text-[9px] font-bold font-mono uppercase tracking-widest mt-1">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}