import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ✅ Se for a pasta de dados, apenas libera imediatamente (sem logs para não poluir)
  if (pathname.startsWith('/data')) {
    return NextResponse.next()
  }

  console.log('🔵 Middleware executou, path:', pathname)
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}