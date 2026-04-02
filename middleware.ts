import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // LOGICA DE DEBLOCARE: Dacă URL-ul conține "rezervare", lăsăm totul să treacă
  // Am pus și varianta cu majuscule/minuscule pentru siguranță
  if (pathname.toLowerCase().includes('rezervare')) {
    return NextResponse.next();
  }

  // Permitem rutele de bază necesare sistemului
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|webp|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // VERIFICARE SESIUNE (doar pentru Admin/Dashboard)
  const cookies = request.cookies.getAll();
  const hasSession = cookies.some(c => 
    c.name.includes('auth-token') || 
    c.name.includes('sb-') || 
    c.name.includes('supabase-auth')
  );

  // Dacă ești pe orice altă pagină (ex: /calendar) și nu ești logat -> Login
  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}