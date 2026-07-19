import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // No-op
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
    }

    // ✅ Folosim clientul admin (service role) — vedem toate profilele,
    // indiferent de politicile RLS care restricționează userii obișnuiți
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select(`
        id, email, full_name, phone, plan_type, subscription_status,
        subscription_current_period_end, subscription_cancel_at_period_end,
        trial_started_at, trial_used, terms_accepted_at, stripe_customer_id,
        updated_at
      `)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Eroare la interogarea profilelor:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profiles: profiles || [] });

  } catch (err: any) {
    console.error("Eroare admin/users:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}