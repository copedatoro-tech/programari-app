import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type SupabaseClient = ReturnType<typeof createBrowserClient>;
const globalForSupabase = global as unknown as { supabase: SupabaseClient };

export const supabase = globalForSupabase.supabase || createBrowserClient(supabaseUrl, supabaseAnonKey);

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabase = supabase;
}