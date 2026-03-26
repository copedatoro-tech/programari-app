import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Inițializăm un răspuns de bază
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Configurăm clientul Supabase pentru Server-Side (SSR)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Actualizăm request-ul pentru a avea cookie-ul disponibil imediat
          request.cookies.set({ name, value, ...options })
          // Re-inițializăm response-ul pentru a propaga noile header-e
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. Verificăm starea autentificării (getUser este mai sigur decât getSession)
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // REGULA A: Protecție pentru paginile private (ex: /profil)
  // Dacă NU este logat și vrea la profil -> Trimite-l la LOGIN
  if (!user && url.pathname.startsWith('/profil')) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // REGULA B: Redirect pentru utilizatori deja logați
  // Dacă ESTE logat și vrea la Login, Register sau Pagina Principală -> Trimite-l la PROFIL
  // Am adăugat o verificare pentru a ne asigura că nu suntem deja pe /profil
  const isAuthPage = url.pathname === '/login' || url.pathname === '/register' || url.pathname === '/'
  if (user && isAuthPage && url.pathname !== '/profil') {
    url.pathname = '/profil'
    return NextResponse.redirect(url)
  }

  return response
}

// CONFIGURARE MATCHER
// Spunem Middleware-ului să ignore fișierele statice (imagini, fonturi, logo)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo-chronos.png (logo-ul tău)
     * - extensii de imagini/fonturi comune
     */
    '/((?!api|_next/static|_next/image|favicon.ico|logo-chronos.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
}