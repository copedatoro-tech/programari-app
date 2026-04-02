import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const lowerPath = pathname.toLowerCase()

  // 1. Permitem accesul pentru RUTELE PUBLICE (fără verificare)
  if (
    lowerPath.includes('/rezervare') || 
    lowerPath.startsWith('/login') || 
    lowerPath.startsWith('/register') ||
    lowerPath.startsWith('/api') || 
    lowerPath.startsWith('/_next') ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|webp|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // 2. Verificăm manual prezența cookie-ului de sesiune pentru rutele de Admin
  // Supabase folosește de obicei un nume de cookie care conține 'auth-token' sau 'sb-access-token'
  const allCookies = req.cookies.getAll()
  const hasAuthCookie = allCookies.some(c => 
    c.name.includes('auth-token') || 
    c.name.includes('sb-') || 
    c.name.includes('supabase')
  )

  // 3. Dacă ești pe o rută privată (Admin, Profil) și NU ai cookie, mergi la login
  if (!hasAuthCookie) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Dacă are cookie, îl lăsăm să treacă spre paginile de Admin
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}