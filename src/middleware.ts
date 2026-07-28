import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  console.log('🔵 Middleware executou, path:', request.nextUrl.pathname)
  return NextResponse.next() // ← Permite todas as rotas livremente
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}