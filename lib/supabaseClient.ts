import { createBrowserClient } from '@supabase/ssr';

// Extragem variabilele de mediu cu verificare
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creăm un Singleton pentru clientul de browser.
 * Acest lucru previne epuizarea resurselor (conexiunilor) în timpul dezvoltării
 * când Next.js reîncarcă modulele la fiecare salvare (Fast Refresh).
 */
const globalForSupabase = global as unknown as { 
  supabase: ReturnType<typeof createBrowserClient> 
};

export const supabase = 
  globalForSupabase.supabase || 
  createBrowserClient(supabaseUrl, supabaseAnonKey);

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabase = supabase;
}