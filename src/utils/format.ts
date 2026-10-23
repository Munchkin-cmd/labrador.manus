export function formatMoney(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000)     return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)         return `$${(value / 1_000).toFixed(1)}K`
  return `$${value}`
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000)     return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)         return `${(value / 1_000).toFixed(1)}K`
  return `${value}`
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now  = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60)   return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400)return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function formatPopulation(value: number): string {
  // ✅ CORRIGIDO: Adicionado a checagem de Bilhões
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B hab`
  if (value >= 1_000_000)     return `${(value / 1_000_000).toFixed(1)}M hab`
  if (value >= 1_000)         return `${(value / 1_000).toFixed(1)}K hab`
  return `${value} hab`
}