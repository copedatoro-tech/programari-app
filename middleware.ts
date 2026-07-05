import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const originalPathname = url.pathname

  const firstSegment = originalPathname.split('/')[1]
  const hasLocalePrefix = (routing.locales as readonly string[]).includes(firstSegment)
  const locale = hasLocalePrefix ? firstSegment : routing.defaultLocale
  const pathname = hasLocalePrefix
    ? (originalPathname.slice(firstSegment.length + 1) || '/')
    : originalPathname

  const withLocale = (path: string) =>
    locale === routing.defaultLocale ? path : `/${locale}${path}`

  if (
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/auth/reset-password') ||
    pathname.includes('reset-password') ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next()
  }

  const intlResponse = intlMiddleware(req)

  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/rezervare')

  if (isPublicRoute) {
    return intlResponse
  }

  const res = intlResponse ?? NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    url.pathname = withLocale('/login')
    return NextResponse.redirect(url)
  }

  if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') {
    url.pathname = withLocale('/programari')
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
}