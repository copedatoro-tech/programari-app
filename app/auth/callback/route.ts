import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // REPARARE: cookies se trimite ca o funcție aici
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
    
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirecționăm folosind originea URL-ului pentru a fi siguri că merge pe Vercel
  return NextResponse.redirect(`${requestUrl.origin}/profil`);
}