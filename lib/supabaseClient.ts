import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 1. Definim un tip pentru instanța noastră
type SupabaseClient = ReturnType<typeof createBrowserClient>;

// 2. Creăm o variabilă globală (pentru a supraviețui între reîncărcările de pagină în dev)
const globalForSupabase = global as unknown as { supabase: SupabaseClient };

// 3. Exportăm instanța unică (Singleton)
export const supabase = globalForSupabase.supabase || createBrowserClient(supabaseUrl, supabaseAnonKey);

// 4. Salvăm în global dacă nu suntem în producție
if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabase = supabase;
}

// Aceasta este singura variabilă pe care o vei importa în page.tsx