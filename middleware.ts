import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const pathname = url.pathname

  // 1. EXCEPTARE RUTE AUTH — trec fără nicio verificare
  if (
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/auth/reset-password') ||
    pathname.includes('reset-password') ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next()
  }

  // 2. RUTE PUBLICE — nu facem niciun request la Supabase, ieșim imediat
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/rezervare')

  // ✅ FIX VITEZĂ: dacă ruta e publică, nu mai apelăm getUser() deloc
  // Evităm round-trip-ul la serverul Supabase pentru pagini care nu au nevoie de auth
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // 3. CONFIGURARE SUPABASE CLIENT (SSR)
  // ✅ FIX BUG: res creat o singură dată, nu recreat la fiecare cookie
  const res = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        // ✅ FIX BUG: setăm toate cookie-urile pe același obiect res, nu recreăm res
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 4. VERIFICARE SESIUNE — ajungem aici DOAR pentru rute protejate
  const { data: { user } } = await supabase.auth.getUser()

  // 5. LOGICĂ REDIRECȚIONARE
  // Nu e logat și încearcă să acceseze rute protejate
  if (!user) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // E logat și încearcă să acceseze login/register → redirect la programări
  if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') {
    url.pathname = '/programari'
    return NextResponse.redirect(url)
  }

  return res
}

// 6. MATCHER — excludem static, imagini, API
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
}