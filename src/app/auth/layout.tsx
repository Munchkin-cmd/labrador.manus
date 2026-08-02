// src/app/(auth)/layout.tsx (ou onde estiver o seu AuthLayout)

// Layout for unauthenticated pages (login, register)
// No header or nav — full screen centered with floating flags
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // ✅ Lista de bandeiras atualizada com os países solicitados
  const flags = [
    '🇺🇸', '🇨🇦', '🇬🇧', '🇮🇪', '🇦🇺', '🇳🇿', // América do Norte, Reino Unido, Oceania
    '🇨🇱', '🇺🇾', '🇪🇸', '🇩🇪', '🇨🇭', '🇦🇹', // América do Sul, Europa Ocidental
    '🇳🇱', '🇧🇪', '🇩🇰', '🇫🇮', '🇸🇪', '🇳🇴', // Benelux, Nórdicos
    '🇱🇺', '🇲🇨', '🇮🇹', '🇰🇷', '🇯🇵', // Europa, Ásia
    '🇺🇳', '🇦🇶' // Organizações internacionais e Antártica
  ]

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      {/* Camada de fundo com bandeiras flutuantes (Fade In/Out) */}
      <div className="absolute inset-0 z-0">
        {flags.map((flag, i) => (
          <div
            key={i}
            className="absolute text-6xl animate-float"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 15}s`,
              fontSize: `${2 + Math.random() * 4}rem`,
            }}
          >
            {flag}
          </div>
        ))}
      </div>

      {/* Conteúdo centralizado */}
      <div className="relative z-10 w-full max-w-md px-4">
        {children}
      </div>
    </main>
  )
}