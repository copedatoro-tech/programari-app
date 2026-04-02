import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // LISTA NEAGRĂ: Doar aceste rute au nevoie de Login
  // Dacă ruta NU începe cu una din astea, o lăsăm să treacă DIRECT
  const isProtectedArea = 
    pathname.startsWith('/programari') || 
    pathname.startsWith('/admin') || 
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/setari');

  if (!isProtectedArea) {
    // Orice altceva (inclusiv /rezervare/...) este lăsat să treacă fără nicio verificare
    return NextResponse.next();
  }

  // DOAR PENTRU ADMIN: Verificăm sesiunea
  const cookies = request.cookies.getAll();
  const hasSession = cookies.some(c => 
    c.name.includes('auth-token') || 
    c.name.includes('sb-') || 
    c.name.includes('supabase-auth')
  );

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}