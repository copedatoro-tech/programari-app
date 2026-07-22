import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Stripe from "stripe";

// La fel ca in celelalte rute Stripe din proiect (checkout, portal, webhook
// etc.) — nu exista un client Stripe central in "lib/", fiecare ruta isi
// instantiaza propriul client.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

    const { userId, action, plan, days, fallbackMode } = await req.json();
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
      // ⚠️ Setare manuală PERMANENTĂ, fără legătură cu Stripe — util pentru
      // conturi de test sau acces gratuit acordat pe termen nelimitat.
      // Nu are sens sa aiba un fallback (nu expira niciodata), deci il curatam.
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ plan_type: plan, manual_grant_expires_at: null, manual_grant_fallback_plan: null })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "grant_temp_access") {
      if (!plan || !VALID_PLANS.includes(plan)) {
        return NextResponse.json({ error: "Plan invalid." }, { status: 400 });
      }
      const numDays = Number(days);
      if (!numDays || numDays <= 0 || numDays > 3650) {
        return NextResponse.json({ error: "Numar de zile invalid." }, { status: 400 });
      }

      // ✅ Citim starea CURENTĂ a userului, ÎNAINTE să o suprascriem — ca sa
      // stim exact la ce sa revenim, daca adminul alege "planul anterior".
      const { data: currentProfile, error: fetchError } = await supabaseAdmin
        .from("profiles")
        .select("plan_type, stripe_subscription_id, manual_grant_expires_at, manual_grant_fallback_plan")
        .eq("id", userId)
        .single();

      if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

      // 🔒 Fix siguranta: daca userul are un abonament Stripe REAL, activ, nu
      // atingem planul lui manual — ar insemna sa-l retrogradam gresit pe cineva
      // care chiar plateste. Adminul poate gestiona abonamente reale direct din
      // Stripe Dashboard, nu de aici.
      if (currentProfile?.stripe_subscription_id) {
        return NextResponse.json(
          { error: "Acest cont are deja un abonament Stripe activ — gestionează-l direct din Stripe Dashboard, nu prin acordare manuală." },
          { status: 400 }
        );
      }

      // 🐛 FIX: daca userul are deja o acordare manuala ACTIVA (neexpirata),
      // "plan_type" curent din DB nu mai reprezinta planul lui real dinainte
      // de orice interventie manuala — reprezinta planul acordat anterior.
      // Trebuie sa refolosim fallback-ul deja salvat, ca sa nu-l pierdem la
      // acordari succesive (ex: FREE -> PRO -> ELITE, inainte sa expire PRO).
      const hasActiveGrant =
        !!currentProfile?.manual_grant_expires_at &&
        new Date(currentProfile.manual_grant_expires_at) > new Date();

      const realUnderlyingPlan =
        hasActiveGrant && currentProfile?.manual_grant_fallback_plan
          ? currentProfile.manual_grant_fallback_plan
          : currentProfile?.plan_type && VALID_PLANS.includes(currentProfile.plan_type)
          ? currentProfile.plan_type
          : "CHRONOS FREE";

      // fallbackMode: "previous" = revine la planul real de dinaintea oricarei
      //               acordari manuale in lant
      //               "free" (sau orice altceva/lipsa) = revine la CHRONOS FREE
      const fallbackPlan = fallbackMode === "previous" ? realUnderlyingPlan : "CHRONOS FREE";

      const expiresAt = new Date(Date.now() + numDays * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          plan_type: plan,
          manual_grant_expires_at: expiresAt,
          manual_grant_fallback_plan: fallbackPlan,
        })
        .eq("id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, expiresAt, fallbackPlan });
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
      // 🐛 FIX: inainte sa stergem contul, verificam daca are un abonament
      // Stripe activ. Daca da, il anulam IMEDIAT (nu la finalul perioadei) —
      // altfel abonamentul continua sa factureze cardul clientului la
      // reinnoire, desi contul lui din aplicatie nu mai exista.
      const { data: profileToDelete, error: profileFetchError } = await supabaseAdmin
        .from("profiles")
        .select("stripe_subscription_id, stripe_customer_id")
        .eq("id", userId)
        .single();

      if (profileFetchError) {
        return NextResponse.json({ error: profileFetchError.message }, { status: 500 });
      }

      let stripeCanceled = false;
      if (profileToDelete?.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(profileToDelete.stripe_subscription_id);
          stripeCanceled = true;
        } catch (stripeErr: any) {
          // Daca abonamentul e deja anulat/inexistent in Stripe, nu blocam
          // stergerea contului pentru atat — doar logam, ca sa stii ulterior.
          console.error("Eroare la anularea abonamentului Stripe:", stripeErr.message);
        }
      }

      // ✅ Șterge complet contul — util pentru conturi de test rămase.
      // Ștergem profilul din tabela "profiles" înainte, apoi userul din Auth.
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);
      if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

      return NextResponse.json({ success: true, stripeCanceled });
    }

    return NextResponse.json({ error: "Acțiune necunoscută." }, { status: 400 });

  } catch (err: any) {
    console.error("Eroare admin/update-user:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}