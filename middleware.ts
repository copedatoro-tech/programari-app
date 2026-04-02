import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // DEBLOCARE: Permitem orice conține "rezervare" sau e pagină de login/statică
  if (
    pathname.includes('/rezervare') || 
    pathname.includes('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|webp)$/)
  ) {
    return NextResponse.next()
  }

  // PROTECȚIE: Doar pentru restul paginilor (Admin/Dashboard)
  const allCookies = req.cookies.getAll()
  const hasToken = allCookies.some(c => c.name.includes('auth-token') || c.name.includes('sb-'))

  if (!hasToken) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}