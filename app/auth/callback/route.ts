import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Colectăm URL-ul pentru a extrage codul de logare trimis de Google
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // Inițializăm clientul Supabase pentru server
    const supabase = createRouteHandlerClient({ cookies });
    
    // Schimbăm codul temporar pe o sesiune de utilizator reală
    await supabase.auth.exchangeCodeForSession(code);
  }

  // După logare, trimitem utilizatorul la pagina de profil (sau dashboard)
  // URL-ul de bază va fi cel al site-ului tău (localhost sau domeniul de pe Vercel)
  return NextResponse.redirect(new URL('/profil', request.url));
}