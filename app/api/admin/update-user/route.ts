import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_PLANS = ["CHRONOS FREE", "CHRONOS PRO", "CHRONOS ELITE", "CHRONOS TEAM"];

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
    }

    const { userId, action, plan } = await req.json();
    if (!userId || !action) {
      return NextResponse.json({ error: "Date incomplete." }, { status: 400 });
    }

    // ✅ Protecție suplimentară — adminul nu poate să-și șteargă/modifice
    // accidental propriul cont din panou
    if (userId === user.id && (action === "delete_user" || action === "reset_2fa")) {
      return NextResponse.json({ error: "Nu poți aplica această acțiune propriului cont." }, { status: 400 });
    }

    if (action === "reset_trial") {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ trial_started_at: new Date().toISOString(), trial_used: false })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "end_trial") {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ trial_started_at: null })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "set_plan") {
      if (!plan || !VALID_PLANS.includes(plan)) {
        return NextResponse.json({ error: "Plan invalid." }, { status: 400 });
      }
      // ⚠️ Setare manuală, fără legătură cu Stripe — util pentru conturi
      // de test sau acces gratuit acordat manual, dar NU pornește nicio taxare
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ plan_type: plan })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "reset_2fa") {
      // ✅ Deblochează un user care și-a pierdut telefonul cu aplicația
      // de autentificare — șterge toți factorii MFA înregistrați
      const { data: factorsData, error: listError } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId });
      if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

      for (const factor of factorsData?.factors || []) {
        await supabaseAdmin.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
      }
      return NextResponse.json({ success: true, removed: factorsData?.factors?.length || 0 });
    }

    if (action === "delete_user") {
      // ✅ Șterge complet contul — util pentru conturi de test rămase.
      // Ștergem profilul din tabela "profiles" înainte, apoi userul din Auth.
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);
      if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acțiune necunoscută." }, { status: 400 });

  } catch (err: any) {
    console.error("Eroare admin/update-user:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}