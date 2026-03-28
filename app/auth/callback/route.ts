import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Redirecționăm implicit către /programari dacă nu avem o altă destinație
  const next = searchParams.get('next') ?? '/programari'

  if (code) {
    const cookieStore = await cookies()
    
    // Pregătim răspunsul de redirect
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Sincronizăm cookie-urile atât în store cât și în response
            cookieStore.set({ name, value, ...options })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            // Eliminare curată a cookie-urilor
            cookieStore.delete({ name, ...options })
            response.cookies.delete({ name, ...options })
          },
        },
      }
    )
    
    // Schimbăm codul primit pe o sesiune reală
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return response
    }
  }

  // În caz de eroare (cod expirat sau invalid), trimitem utilizatorul la Login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}