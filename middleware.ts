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

  // EXCEPTARE RUTE AUTENTIFICARE
  if (
    pathname.startsWith('/auth/callback') || 
    pathname.startsWith('/auth/reset-password') ||
    pathname.includes('reset-password') ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next()
  }

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        /**
         * Tipizăm explicit parametrul cookiesToSet ca fiind un array de CookieToSet
         * pentru a rezolva TS(7006) și TS(7031)
         */
        setAll: (cookiesToSet: CookieToSet[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Folosim getUser() pentru securitate
  const { data: { user } } = await supabase.auth.getUser()

  // ✅ CORECȚIE: Am adăugat pathname === '/' pentru ca Landing Page-ul să fie public!
  const isPublicRoute = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname === '/forgot-password' ||
    pathname.startsWith('/rezervare')

  // Redirecționare dacă nu este logat și încearcă să acceseze o rută privată (admin)
  if (!user && !isPublicRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirecționare dacă este deja logat și accesează pagini de auth (login/register)
  if (user && isPublicRoute) {
    // Permitem accesul la rezervare și la landing chiar dacă e logat, 
    // dar restul paginilor de auth le redirecționăm către dashboard
    // ✅ CORECȚIE: Nu redirecționăm dacă e pe '/' pentru a-i permite să vadă landing-ul sau să navigheze normal
    if (pathname !== '/' && !pathname.includes('reset-password') && !pathname.startsWith('/rezervare')) {
      url.pathname = '/programari'
      return NextResponse.redirect(url)
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
}