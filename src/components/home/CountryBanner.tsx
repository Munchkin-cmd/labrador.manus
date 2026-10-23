'use client'

import { CountryFull, UserProfile } from '@/hooks/useCountry'
import Image from 'next/image'

interface Props {
  country: CountryFull
  profile: UserProfile
}

export default function CountryBanner({ country, profile }: Props) {
  // ✅ FUNDO DA HOME: Usa a bandeira do país (profile.flag_url)
  const backgroundImage = profile.flag_url ?? null

  return (
    // ✅ ALTERAÇÕES: Adicionado mt-4 (vão pro header), rounded-xl (borda arredondada), border e shadow.
    // Altura aumentada de h-40 para h-48 para a imagem não ficar espremida.
    <div className="relative w-full h-48 mt-4 rounded-xl bg-gradient-to-br from-primary-dark to-secondary-dark overflow-hidden border border-surface-border shadow-lg">
      
      {/* Fundo: Bandeira */}
      {backgroundImage ? (
        <Image src={backgroundImage} alt="Bandeira" fill className="object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-secondary/60" />
      )}

      {/* Overlay escuro para dar contraste ao texto */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Conteúdo */}
      <div className="absolute inset-0 flex items-end p-4 sm:p-5 gap-3">
        
        {/* ✅ MOLDURA CIRCULAR: Foto do Líder */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/30 overflow-hidden bg-white/10 flex-shrink-0 shadow-md">
          {profile.leader_url ? (
            <Image src={profile.leader_url} alt="Líder" width={64} height={64} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
          )}
        </div>

        {/* Informações do país */}
        <div className="flex-1 min-w-0 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl drop-shadow-md">{country.flag_emoji}</span>
            <h2 className="text-white font-black text-xl sm:text-2xl leading-tight truncate drop-shadow-md">{country.name}</h2>
          </div>
          {country.motto && (
            <p className="text-white/80 text-xs sm:text-sm italic truncate mt-1 drop-shadow-sm">"{country.motto}"</p>
          )}
          <p className="text-white/60 text-[10px] sm:text-xs mt-0.5 truncate font-mono uppercase tracking-wider">
            {country.leader_title}{country.leader_name ? `: ${country.leader_name}` : ''} · {country.capital}
          </p>
        </div>
      </div>
    </div>
  )
}