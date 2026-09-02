// src/app/(auth)/layout.tsx
'use client'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // ✅ Lista de bandeiras para o fundo (com repetição de 2x cada)
  const baseFlags = [
    '🇺🇸', '🇨🇦', '🇬🇧', '🇮🇪', '🇦🇺', '🇳🇿',
    '🇨🇱', '🇺🇾', '🇪🇸', '🇩🇪', '🇨🇭', '🇦🇹',
    '🇳🇱', '🇧🇪', '🇩🇰', '🇫🇮', '🇸🇪', '🇳🇴',
    '🇱🇺', '🇲🇨', '🇮🇹', '🇰🇷', '🇯🇵',
    '🇺🇳', '🇦🇶',
    '🇨🇳', '🇵🇹', '🇬🇷', '🇨🇿', '🇮🇸', '🇸🇮', '🇲🇪', '🇭🇷', '🇪🇪', '🇧🇷'
  ]

  const flags = [...baseFlags, ...baseFlags]

  const bounceIndices = new Set<number>()
  while (bounceIndices.size < 4) {
    bounceIndices.add(Math.floor(Math.random() * flags.length))
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      {/* CSS ANIMATIONS */}
      <style>{`
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px); opacity: 0.3; }
          50% { transform: translateY(-20px); opacity: 0.8; }
        }
        @keyframes bounce-fast {
          0%, 100% { transform: translateY(0px); opacity: 0.6; }
          25% { transform: translateY(-40px); opacity: 1; }
          50% { transform: translateY(0px); opacity: 0.6; }
          75% { transform: translateY(-20px); opacity: 0.8; }
        }
        .animate-float-fast { animation: float-fast 3s ease-in-out infinite; }
        .animate-bounce-fast { animation: bounce-fast 0.8s ease-in-out infinite; }
      `}</style>

      {/* Bandeiras de fundo */}
      <div className="absolute inset-0 z-0">
        {flags.map((flag, i) => {
          const hasBounce = bounceIndices.has(i)
          return (
            <div
              key={i}
              className={hasBounce ? 'animate-bounce-fast' : 'animate-float-fast'}
              style={{
                position: 'absolute',
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                fontSize: `${2 + Math.random() * 4}rem`,
              }}
            >
              {flag}
            </div>
          )
        })}
      </div>

      {/* Conteúdo centralizado (forms, login, etc) */}
      <div className="relative z-10 w-full max-w-md px-4">
        {children}
      </div>
    </main>
  )
}