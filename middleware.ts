import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const lowerPath = pathname.toLowerCase()

  // EXCEPȚIE TOTALĂ pentru orice conține "rezervare"
  // Asta va permite /rezervare, /Rezervare, /rezervare/orice-slug
  if (lowerPath.includes('rezervare')) {
    return NextResponse.next()
  }

  // Restul rutelor publice standard
  const isPublicRoute = 
    pathname === '/' || 
    lowerPath.startsWith('/login') ||
    lowerPath.startsWith('/register') ||
    lowerPath.startsWith('/api') ||
    lowerPath.startsWith('/_next') ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|webp|woff|woff2|ttf|css|js|map)$/);

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Verificare Token pentru paginile protejate (Admin, Profil, etc.)
  const allCookies = req.cookies.getAll()
  const hasSupabaseToken = allCookies.some(cookie => cookie.name.includes('auth-token'))

  if (!hasSupabaseToken) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}