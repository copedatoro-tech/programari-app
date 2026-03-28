import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = async () => {
  // În Next.js 15/16, cookies() este asincron
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            // Această eroare apare de obicei în Server Components unde 
            // cookie-urile nu pot fi modificate. Logica de refresh a sesiunii
            // este gestionată oricum în middleware.ts. 
            // Nu este necesară nicio acțiune aici pentru a evita blocarea randării.
          }
        },
      },
    }
  )
}