import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const pathname = url.pathname

  // EXCEPTARE RUTE AUTENTIFICARE - Verificăm dacă suntem pe o rută care nu trebuie să redirecționeze la login
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
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Folosim getUser() pentru securitate, care verifică validitatea token-ului
  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname === '/forgot-password'

  // Dacă utilizatorul NU este logat și încearcă să acceseze o rută privată
  if (!user && !isPublicRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Dacă utilizatorul ESTE logat și încearcă să acceseze login/register/forgot
  if (user && isPublicRoute) {
    // Verificăm să nu fim în proces de resetare parolă
    if (!pathname.includes('reset-password')) {
      url.pathname = '/programari'
      return NextResponse.redirect(url)
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - documente (folderul de documente dacă există)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
}