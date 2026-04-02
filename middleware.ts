import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // LOGICA DE DEBLOCARE: Dacă URL-ul conține "rezervare", "login" sau e fișier static, IGNOREAZĂ autentificarea
  if (
    pathname.includes('/rezervare') || 
    pathname.includes('/login') || 
    pathname.includes('/register') ||
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|webp)$/)
  ) {
    return NextResponse.next();
  }

  // DOAR PENTRU ADMIN (orice altceva): Verificăm dacă e logat
  const token = req.cookies.get('sb-access-token') || req.cookies.get('auth-token');

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}