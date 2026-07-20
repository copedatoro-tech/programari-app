import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAndConsumeWhatsAppQuota } from "@/lib/whatsappQuota";

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const TEMPLATE_NAME = "reamintire_revenire"; // ✅ trebuie creat și aprobat în Meta Business Manager

// ✅ Ruta e menită să fie apelată zilnic, printr-un Cron Job (Vercel Cron sau extern),
// nu manual. Pentru fiecare salon cu funcția activată, verifică fiecare client:
//
// - Dacă are CEL PUȚIN 2 vizite anterioare, calculează intervalul mediu real dintre
//   vizitele lui (nu folosește valoarea generală din Settings) — practic "învață"
//   tiparul personal de revenire al fiecărui client, fără niciun model AI extern,
//   doar o medie simplă, explicabilă, calculată din istoricul lui real.
// - Dacă are o singură vizită, folosește valoarea generală (implicit 30 zile).
// - Mesajul include automat serviciul cel mai frecvent ales de acel client, ca să
//   fie personalizat ("Ai nevoie de o nouă programare pentru Tuns?").
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
    }

    const { data: eligibleProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, slug, full_name, plan_type, rebooking_reminder_enabled, rebooking_reminder_days")
      .eq("rebooking_reminder_enabled", true);

    if (!eligibleProfiles || eligibleProfiles.length === 0) {
      return NextResponse.json({ message: "Niciun salon cu funcția activată.", sent: 0 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.chronosproductivity.com";
    let totalSent = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const profile of eligibleProfiles) {
      const plan = (profile.plan_type || "").toUpperCase();
      if (!plan.includes("ELITE") && !plan.includes("TEAM")) continue; // doar planuri cu WhatsApp
      if (!profile.slug) continue; // fără pagină publică, nu are rost linkul

      const defaultDays = profile.rebooking_reminder_days || 30;
      const today = new Date();

      const { data: clients } = await supabaseAdmin
        .from("client_cases")
        .select("id, client_name, phone_number, last_rebooking_reminder_sent")
        .eq("user_id", profile.id)
        .not("phone_number", "is", null);

      if (!clients || clients.length === 0) continue;

      for (const client of clients) {
        try {
          // ✅ Aducem TOATE programările trecute ale clientului, cronologic —
          // nu doar ultima, ca să putem calcula intervalul mediu real
          const { data: apptsData } = await supabaseAdmin
            .from("appointments")
            .select("date, nume_serviciu")
            .eq("user_id", profile.id)
            .eq("phone", client.phone_number)
            .neq("status", "cancelled")
            .order("date", { ascending: true });

          if (!apptsData || apptsData.length === 0) continue;

          const pastAppts = apptsData.filter((a) => a.date && new Date(a.date) <= today);
          const hasFutureAppt = apptsData.some((a) => a.date && new Date(a.date) > today);

          if (pastAppts.length === 0 || hasFutureAppt) continue; // are deja o programare viitoare, sărim

          const lastPastDate = pastAppts[pastAppts.length - 1].date as string;

          // ✅ Interval personalizat — dacă are cel puțin 2 vizite trecute, calculăm
          // media reală a intervalelor lui, în loc de valoarea generală a salonului
          let personalizedDays = defaultDays;
          if (pastAppts.length >= 2) {
            const gaps: number[] = [];
            for (let i = 1; i < pastAppts.length; i++) {
              const d1 = new Date(pastAppts[i - 1].date as string).getTime();
              const d2 = new Date(pastAppts[i].date as string).getTime();
              gaps.push(Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
            }
            const avgGap = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
            if (avgGap > 3) personalizedDays = avgGap; // prag minim de siguranță, evită intervale absurd de mici
          }

          const daysSince = Math.floor((today.getTime() - new Date(lastPastDate).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince < personalizedDays) continue; // n-a trecut destul timp încă, pentru EL

          if (client.last_rebooking_reminder_sent && client.last_rebooking_reminder_sent >= lastPastDate) {
            continue; // deja trimis pentru acest "gol" de vizite
          }

          const quota = await checkAndConsumeWhatsAppQuota(profile.id, plan);
          if (!quota.allowed) { totalSkipped++; continue; }

          // ✅ Serviciul cel mai frecvent ales de acest client, pentru personalizare
          const serviceCounts: Record<string, number> = {};
          pastAppts.forEach((a: any) => {
            if (a.nume_serviciu) serviceCounts[a.nume_serviciu] = (serviceCounts[a.nume_serviciu] || 0) + 1;
          });
          const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

          const digits = client.phone_number.replace(/\D/g, "");
          const waNumber = digits.startsWith("0") ? "4" + digits : digits;
          const bookingLink = `${baseUrl}/rezervare/${profile.slug}`;

          const res = await fetch(`https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: waNumber,
              type: "template",
              template: {
                name: TEMPLATE_NAME,
                language: { code: "ro" },
                components: [
                  {
                    type: "body",
                    parameters: [
                      { type: "text", text: client.client_name || "acolo" },
                      { type: "text", text: topService || "o vizită nouă" },
                      { type: "text", text: profile.full_name || "noi" },
                      { type: "text", text: bookingLink },
                    ],
                  },
                ],
              },
            }),
          });

          if (res.ok) {
            await supabaseAdmin
              .from("client_cases")
              .update({ last_rebooking_reminder_sent: today.toISOString().split("T")[0] })
              .eq("id", client.id);
            totalSent++;
          } else {
            const errData = await res.json().catch(() => ({}));
            errors.push(`${client.phone_number}: ${errData?.error?.message || res.statusText}`);
          }
        } catch (innerErr: any) {
          errors.push(`Client ${client.id}: ${innerErr.message}`);
        }
      }
    }

    return NextResponse.json({ sent: totalSent, skippedNoQuota: totalSkipped, errors });
  } catch (error: any) {
    console.error("Eroare reamintiri revenire:", error.message);
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 });
  }
}