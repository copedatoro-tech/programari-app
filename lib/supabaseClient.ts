import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Creăm o singură funcție care returnează clientul de browser
// Aceasta va fi folosită în toate paginile tale (.tsx)
export const createClient = () => 
  createBrowserClient(supabaseUrl, supabaseAnonKey)

// Exportăm și o instanță directă pentru compatibilitate rapidă
export const supabase = createClient()