import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Definim interfața pentru setările de cookie pentru a elimina erorile 
 * de tip 'any' din setAll
 */
interface CookieToSet {
  name: string
  value: string
  options: CookieOptions
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const pathname = url.pathname

  // 1. EXCEPTARE RUTE AUTENTIFICARE ȘI CALLBACK-URI
  // Este critic să lăsăm callback-urile să treacă fără intervenția getUser() imediată
  if (
    pathname.startsWith('/auth/callback') || 
    pathname.startsWith('/auth/reset-password') ||
    pathname.includes('reset-password') ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next()
  }

  // Creăm răspunsul inițial
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  // 2. CONFIGURARE SUPABASE CLIENT (SSR)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        /**
         * Tipizăm explicit pentru a rezolva TS(7006) și TS(7031)
         * Folosim un wrapper pentru a ne asigura că setăm cookie-urile și în request și în response
         */
        setAll: (cookiesToSet: CookieToSet[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value) // Setăm în request pentru a fi disponibil imediat
            res = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })
            res.cookies.set(name, value, options) // Setăm în response pentru browser
          })
        },
      },
    }
  )

  // 3. VERIFICARE SESIUNE
  // getUser() este metoda sigură (verifică token-ul la server-ul Supabase)
  const { data: { user } } = await supabase.auth.getUser()

  // 4. DEFINIRE RUTE PUBLICE
  // Am adăugat '/abonamente' la publice pentru ca utilizatorii noi să le vadă? 
  // Dacă nu, rămâne cum ai stabilit tu:
  const isPublicRoute = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname === '/forgot-password' ||
    pathname.startsWith('/rezervare')

  // 5. LOGICĂ REDIRECȚIONARE

  // Caz A: Nu este logat și încearcă să acceseze rute de administrare (programări, setări, etc.)
  if (!user && !isPublicRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Caz B: Este logat și încearcă să acceseze pagini de auth (Login/Register)
  if (user && (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password')) {
    url.pathname = '/programari'
    return NextResponse.redirect(url)
  }

  // Notă: Permitem accesul la Landing Page ('/') și la '/rezervare' indiferent dacă este logat sau nu.

  return res
}

// 6. CONFIGURARE MATCHER
// Excludem fișierele statice, imaginile și API-urile interne pentru performanță
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public assets (png, jpg, svg, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
}