import { createClient } from "@supabase/supabase-js";

// ⚠️ ATENȚIE: acest client folosește cheia "service_role", care ignoră
// complet regulile de securitate (RLS) din Supabase. Se folosește DOAR
// în cod care rulează pe server (rute API, procese automate/cron) —
// NICIODATĂ în componente care rulează în browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);