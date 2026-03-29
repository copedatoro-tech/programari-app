import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // 1. Verificăm ce cale accesează utilizatorul
  const { pathname } = req.nextUrl

  // 2. DEFINIM EXCEPȚIILE (Pagini care nu au nevoie de login)
  // Adăugăm /settings aici pentru a opri orice redirect
  const isPublicPage = 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname === '/forgot-password' ||
    pathname === '/settings' || 
    pathname.startsWith('/_next') || 
    pathname.includes('/api/');

  // 3. Verificăm sesiunea DOAR dacă nu este pagină publică
  if (!isPublicPage) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return res
}

// Configurare pentru a rula pe toate rutele
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}