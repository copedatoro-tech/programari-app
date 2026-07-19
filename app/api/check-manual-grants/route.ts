import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ✅ Ruleaza o data pe zi (cron) - verifica acordarile manuale de acces
// (facute din panoul de admin) care au expirat, si le readuce la Free.
// Nu atinge conturile cu abonament real Stripe (stripe_subscription_id).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    const { data: expired, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, plan_type, manual_grant_expires_at")
      .lte("manual_grant_expires_at", now)
      .not("manual_grant_expires_at", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!expired || expired.length === 0) {
      return NextResponse.json({ reverted: 0, message: "Nicio acordare manuala expirata." });
    }

    let reverted = 0;
    for (const profile of expired) {
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ plan_type: "CHRONOS FREE", manual_grant_expires_at: null })
        .eq("id", profile.id);

      if (!updateError) reverted++;
    }

    return NextResponse.json({ reverted, checked: expired.length });

  } catch (err: any) {
    console.error("Eroare check-manual-grants:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}