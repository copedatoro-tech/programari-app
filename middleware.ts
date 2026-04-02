import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Permitem accesul COMPLET PUBLIC pentru orice conține "rezervare"
  if (pathname.toLowerCase().includes('/rezervare')) {
    return NextResponse.next();
  }

  // 2. Permitem rutele de sistem, autentificare și fișierele statice
  if (
    pathname.startsWith('/auth') || // Folderul tău din captura 151118.png
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|webp|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 3. Protecție Admin: Verificăm cookie-urile de sesiune
  const hasSession = request.cookies.getAll().some(c => 
    c.name.includes('auth-token') || 
    c.name.includes('sb-')
  );

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}