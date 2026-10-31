const NUMBER_SUFFIXES = [
  { value: 1e33, symbol: 'D' },  // Decilhão
  { value: 1e30, symbol: 'N' },  // Nonilhão
  { value: 1e27, symbol: 'O' },  // Octilhão
  { value: 1e24, symbol: 'Sp' }, // Septilhão
  { value: 1e21, symbol: 'Sx' }, // Sextilhão
  { value: 1e18, symbol: 'Qi' }, // Quintilhão
  { value: 1e15, symbol: 'Q' },  // Quatrilhão
  { value: 1e12, symbol: 'T' },  // Trilhão
  { value: 1e9,  symbol: 'B' },  // Bilhão
  { value: 1e6,  symbol: 'M' },  // Milhão
  { value: 1e3,  symbol: 'K' },  // Milhar
]

export function formatMoney(value: number): string {
  if (value === 0) return '$0'
  
  const tier = NUMBER_SUFFIXES.find(tier => Math.abs(value) >= tier.value)
  if (tier) {
    return `$${(value / tier.value).toFixed(1)}${tier.symbol}`
  }
  return `$${value.toFixed(0)}`
}

export function formatNumber(value: number): string {
  if (value === 0) return '0'
  
  const tier = NUMBER_SUFFIXES.find(tier => Math.abs(value) >= tier.value)
  if (tier) {
    return `${(value / tier.value).toFixed(1)}${tier.symbol}`
  }
  return `${value.toFixed(0)}`
}

export function formatPopulation(value: number): string {
  if (value === 0) return '0 hab'
  
  const tier = NUMBER_SUFFIXES.find(tier => Math.abs(value) >= tier.value)
  if (tier) {
    return `${(value / tier.value).toFixed(1)}${tier.symbol} hab`
  }
  return `${value.toFixed(0)} hab`
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