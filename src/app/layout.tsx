import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Labrador',
  description: 'O jogo de estratégia geopolítica',
}

// 🎨 Cor da barra do navegador em mobile atualizada para o novo Azul Escuro
export const viewport: Viewport = {
  themeColor: '#060A14',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      {/* ✅ Fundo atualizado para a nova cor sólida, com antialiased para a fonte ficar mais nítida */}
      <body className={`${inter.className} bg-[#060A14] text-white antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html> 
  )
}