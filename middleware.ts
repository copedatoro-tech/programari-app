import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Permitem accesul COMPLET PUBLIC pentru orice începe cu /rezervare
  // Folosim startsWith pentru a prinde /rezervare, /rezervare/slug, etc.
  if (pathname.toLowerCase().startsWith('/rezervare')) {
    return NextResponse.next();
  }

  // 2. Permitem rutele de sistem, autentificare și fișierele statice
  if (
    pathname.startsWith('/auth') || 
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|webp|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 3. Protecție Admin: Verificăm cookie-urile de sesiune
  const cookies = request.cookies.getAll();
  const hasSession = cookies.some(c => 
    c.name.includes('auth-token') || 
    c.name.includes('sb-') ||
    c.name.includes('supabase-auth')
  );

  if (!hasSession) {
    // Redirecționăm la login doar dacă nu e o rută publică definită mai sus
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}