import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Debug: Acest mesaj va apărea în log-urile Vercel
  console.log("Middleware verifică ruta:", pathname);

  const isPublicRoute = 
    pathname === '/' || 
    pathname.startsWith('/rezervare') || 
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|webp|woff|woff2|ttf|css|js|map)$/);

  if (isPublicRoute) {
    return NextResponse.next();
  }

  const allCookies = req.cookies.getAll();
  const hasSupabaseToken = allCookies.some(cookie => cookie.name.includes('auth-token'));

  if (!hasSupabaseToken) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}