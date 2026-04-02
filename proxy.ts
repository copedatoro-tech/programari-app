import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Permitem rutele publice și fișierele statice
  if (
    pathname === '/' || // Adăugat: Permitem pagina principală pentru campania publicitară
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/rezervare') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|webp|woff|woff2|ttf|css|js|map)$/)
  ) {
    return NextResponse.next()
  }

  // Verificăm dacă există orice cookie care conține "auth-token" 
  // (Supabase folosește un prefix dinamic bazat pe ID-ul proiectului)
  const allCookies = req.cookies.getAll()
  const hasSupabaseToken = allCookies.some(cookie => cookie.name.includes('auth-token'))

  if (!hasSupabaseToken) {
    console.log("Token negăsit, redirect către login de la:", pathname)
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}