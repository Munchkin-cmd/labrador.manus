// src/app/(auth)/layout.tsx
'use client'

// 1. Definimos a lista de bandeiras (menos repetição, mais variedade)
const FLAGS = [
  '🇺🇸', '🇧🇷', '🇷🇺', '🇨🇳', '🇩🇪', '🇬🇧', '🇯🇵', '🇨🇦', '🇦🇺', '🇿🇦',
  '🇫🇷', '🇮🇳', '🇮🇹', '🇪🇸', '🇲🇽', '🇦🇷', '🇰🇷', '🇸🇦', '🇹🇷', '🇮🇩',
  '🇳🇬', '🇪🇬', '🇮🇷', '🇵🇰', '🇳🇱', '🇨🇭', '🇸🇪', '🇳🇴', '🇵🇱', '🇺🇦'
]

// 2. Geramos as posições FORA do componente. 
// Assim, as bandeiras não mudam de lugar quando você digita na tela.
const BACKGROUND_ELEMENTS = FLAGS.map((flag, i) => ({
  id: i,
  flag,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  size: `${1.5 + Math.random() * 2.5}rem`, // Tamanhos mais equilibrados
  delay: `${Math.random() * 5}s`,
  animation: Math.random() > 0.8 ? 'bounce-fast' : 'float-fast' // Apenas 20% quica
}))

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // 3. ✅ FUNDO ALTERADO: Azul na esquerda, Preto no meio, Vermelho na direita
    <main 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(to right, #1e3a8a 0%, #000000 50%, #991b1b 100%)'
      }}
    >
      
      {/* CSS ANIMATIONS */}
      <style>{`
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px); opacity: 0.4; }
          50% { transform: translateY(-15px); opacity: 0.8; }
        }
        @keyframes bounce-fast {
          0%, 100% { transform: translateY(0px); opacity: 0.6; }
          50% { transform: translateY(-25px); opacity: 1; }
        }
        .animate-float-fast { animation: float-fast 4s ease-in-out infinite; }
        .animate-bounce-fast { animation: bounce-fast 2s ease-in-out infinite; }
      `}</style>

      {/* 4. Bandeiras de fundo (Agora com brilho e sem pular) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {BACKGROUND_ELEMENTS.map((el) => (
          <div
            key={el.id}
            className={el.animation === 'bounce-fast' ? 'animate-bounce-fast' : 'animate-float-fast'}
            style={{
              position: 'absolute',
              top: el.top,
              left: el.left,
              fontSize: el.size,
              animationDelay: el.delay,
              filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.8))' // Sombra mais forte para destacar no fundo colorido
            }}
          >
            {el.flag}
          </div>
        ))}
      </div>

      {/* 5. ✅ MÁSCARA ALTERADA: Um escurecimento radial mais sutil que já é coberto pelo gradiente principal */}
      <div className="absolute inset-0 z-0 bg-black/20 pointer-events-none" />

      {/* Conteúdo centralizado (Login, Cadastro, etc) */}
      <div className="relative z-10 w-full max-w-md px-4 py-8">
        {children}
      </div>
    </main>
  )
}