// src/app/(auth)/layout.tsx

'use client'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // ✅ Lista de bandeiras para o fundo
  const flags = [
    '🇺🇸', '🇨🇦', '🇬🇧', '🇮🇪', '🇦🇺', '🇳🇿',
    '🇨🇱', '🇺🇾', '🇪🇸', '🇩🇪', '🇨🇭', '🇦🇹',
    '🇳🇱', '🇧🇪', '🇩🇰', '🇫🇮', '🇸🇪', '🇳🇴',
    '🇱🇺', '🇲🇨', '🇮🇹', '🇰🇷', '🇯🇵',
    '🇺🇳', '🇦🇶'
  ]

  // ✅ Índices das bandeiras que vão fazer bounce (2-4 escolhidas aleatoriamente)
  const bounceIndices = new Set<number>()
  while (bounceIndices.size < 4) {
    bounceIndices.add(Math.floor(Math.random() * flags.length))
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
      {/* ═══ CSS ANIMATIONS ═══ */}
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

        .animate-float-fast {
          animation: float-fast 6s ease-in-out infinite;
        }

        .animate-bounce-fast {
          animation: bounce-fast 1.2s ease-in-out infinite;
        }

        .dollar-badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          font-size: 3.5rem;
          font-weight: bold;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .dollar-text {
          position: absolute;
          bottom: 4px;
          font-size: 0.65rem;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      {/* Camada de fundo com bandeiras flutuantes (mais rápido) */}
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

      {/* ═══ DÓLAR COM "LABRADOR" (centralizado no topo do form) ═══ */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-start justify-center pt-20">
        <div className="dollar-badge">
          💵
          <div className="dollar-text">LABRADOR</div>
        </div>
      </div>

      {/* Conteúdo centralizado (forms, login, etc) */}
      <div className="relative z-10 w-full max-w-md px-4">
        {children}
      </div>
    </main>
  )
}