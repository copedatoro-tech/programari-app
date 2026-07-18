import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ✅ Prețurile de lansare curente — dacă se schimbă mai târziu, actualizează aici
const PLAN_PRICES: Record<string, number> = {
  "CHRONOS PRO": 49,
  "CHRONOS ELITE": 99,
  "CHRONOS TEAM": 199,
};

const REMINDER_DAYS_BEFORE = 7;

export async function GET(request: Request) {
  // ✅ Protecție — doar cron-job.org (sau Vercel Cron) cu secretul corect poate rula asta
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ✅ Fereastra de căutare: profile a căror reînnoire cade exact peste 7 zile
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() + REMINDER_DAYS_BEFORE);
    windowStart.setHours(0, 0, 0, 0);

    const windowEnd = new Date(windowStart);
    windowEnd.setHours(23, 59, 59, 999);

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, plan_type, subscription_current_period_end, subscription_cancel_at_period_end, preferred_locale")
      .gte("subscription_current_period_end", windowStart.toISOString())
      .lte("subscription_current_period_end", windowEnd.toISOString())
      .eq("subscription_cancel_at_period_end", false)
      .neq("plan_type", "CHRONOS FREE");

    if (error) {
      console.error("Eroare la interogarea profilelor:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    let sent = 0;
    let failed = 0;

    for (const profile of profiles || []) {
      if (!profile.email) continue;

      const planKey = (profile.plan_type || "").toUpperCase().trim();
      const suma = PLAN_PRICES[planKey] || 0;

      try {
        const res = await fetch(`${baseUrl}/api/send-renewal-reminder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: profile.email,
            nume: profile.full_name,
            dataReinnoire: profile.subscription_current_period_end,
            suma,
            currency: "RON",
            manageUrl: `${baseUrl}/${profile.preferred_locale || "ro"}/settings`,
            locale: profile.preferred_locale || "ro",
          }),
        });

        if (res.ok) sent++;
        else failed++;
      } catch (e) {
        console.error(`Eroare trimitere reamintire pentru ${profile.email}:`, e);
        failed++;
      }
    }

    return NextResponse.json({ checked: profiles?.length || 0, sent, failed });

  } catch (err: any) {
    console.error("Eroare send-renewal-reminders:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}