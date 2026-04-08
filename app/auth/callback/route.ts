import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/programari'

  if (code) {
    const cookieStore = await cookies()
    
    // Determinăm destinația finală
    const redirectUrl = type === 'recovery' 
      ? `${origin}/auth/reset-password` 
      : `${origin}${next}`;

    // Creăm un răspuns de redirect curat
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Setăm cookie-ul atât în store-ul serverului cât și în obiectul de răspuns
            cookieStore.set({ name, value, ...options })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
            response.cookies.delete({ name, ...options })
          },
        },
      }
    )

    // Această funcție declanșează automat handler-ul de 'set' de mai sus
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      console.log('Redirecting to:', redirectUrl)
      return response
    }
  }

  // Dacă codul lipsește sau a expirat
  return NextResponse.redirect(`${origin}/login?error=session_expired`)
}