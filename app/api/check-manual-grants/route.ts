import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ✅ Ruleaza o data pe zi (cron) - verifica acordarile manuale de acces
// (facute din panoul de admin) care au expirat.
//
// 🔄 ACTUALIZAT (2026-07): la expirare, contul revine la planul salvat in
// "manual_grant_fallback_plan" (setat cand s-a facut acordarea, din admin),
// nu mereu la CHRONOS FREE ca inainte. Daca acea coloana e goala (acordari
// vechi, facute inainte de aceasta modificare), se pastreaza comportamentul
// vechi — revine la CHRONOS FREE.
//
// 🔒 De asemenea, sare explicit peste orice cont cu abonament Stripe activ
// (stripe_subscription_id populat) — nu-l atinge, indiferent de ce scrie in
// manual_grant_expires_at. Un cont care plateste real nu trebuie retrogradat
// niciodata de acest cron.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    const { data: expired, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, plan_type, manual_grant_expires_at, manual_grant_fallback_plan, stripe_subscription_id")
      .lte("manual_grant_expires_at", now)
      .not("manual_grant_expires_at", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!expired || expired.length === 0) {
      return NextResponse.json({ reverted: 0, message: "Nicio acordare manuala expirata." });
    }

    let reverted = 0;
    let skippedStripeActive = 0;

    for (const profile of expired) {
      // 🔒 Cont cu abonament Stripe real activ — nu-l atingem deloc, doar
      // curatam campurile de acordare manuala, ca sa nu mai apara in lista.
      if (profile.stripe_subscription_id) {
        await supabaseAdmin
          .from("profiles")
          .update({ manual_grant_expires_at: null, manual_grant_fallback_plan: null })
          .eq("id", profile.id);
        skippedStripeActive++;
        continue;
      }

      const fallbackPlan = profile.manual_grant_fallback_plan || "CHRONOS FREE";

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({
          plan_type: fallbackPlan,
          manual_grant_expires_at: null,
          manual_grant_fallback_plan: null,
        })
        .eq("id", profile.id);

      if (!updateError) reverted++;
    }

    return NextResponse.json({ reverted, skippedStripeActive, checked: expired.length });

  } catch (err: any) {
    console.error("Eroare check-manual-grants:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}