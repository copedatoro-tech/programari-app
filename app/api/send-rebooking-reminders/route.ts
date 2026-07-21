import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
//
// 📧 CONVERTIT PE EMAIL (2026-07): trimitea inițial pe WhatsApp Business API,
// dezactivat temporar din cauza costurilor și complexității de configurare Meta.
// Rămâne disponibil doar pentru planurile ELITE și TEAM, la fel ca înainte.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Eroare Configurare: API Key Resend lipsește din server." }, { status: 500 });
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
    const errors: string[] = [];

    for (const profile of eligibleProfiles) {
      const plan = (profile.plan_type || "").toUpperCase();
      if (!plan.includes("ELITE") && !plan.includes("TEAM")) continue; // functie disponibila doar ELITE/TEAM
      if (!profile.slug) continue; // fără pagină publică, nu are rost linkul

      const defaultDays = profile.rebooking_reminder_days || 30;
      const today = new Date();

      const { data: clients } = await supabaseAdmin
        .from("client_cases")
        .select("id, client_name, client_email, phone_number, last_rebooking_reminder_sent")
        .eq("user_id", profile.id)
        .not("client_email", "is", null);

      if (!clients || clients.length === 0) continue;

      for (const client of clients) {
        try {
          if (!client.client_email) continue; // fără email, nu avem cum trimite

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

          // ✅ Serviciul cel mai frecvent ales de acest client, pentru personalizare
          const serviceCounts: Record<string, number> = {};
          pastAppts.forEach((a: any) => {
            if (a.nume_serviciu) serviceCounts[a.nume_serviciu] = (serviceCounts[a.nume_serviciu] || 0) + 1;
          });
          const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

          const bookingLink = `${baseUrl}/rezervare/${profile.slug}`;

          const safeName = escapeHtml(client.client_name || "acolo");
          const safeService = escapeHtml(topService || "o nouă vizită");
          const safeSalon = escapeHtml(profile.full_name || "noi");

          const dataMail = await resend.emails.send({
            from: "Chronos <notificari@chronosproductivity.com>",
            to: [client.client_email],
            subject: `${safeSalon} — E timpul pentru o nouă vizită?`,
            html: `
              <div style="font-family: 'Helvetica', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #0f172a; background-color: #f8fafc; border-radius: 24px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <img src="${baseUrl}/logo-chronos.png" alt="Chronos" width="64" height="64" style="display: inline-block;" />
                </div>
                <h1 style="font-size: 24px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.05em; margin-bottom: 24px; text-align: center;">
                  CHRONOS<span style="color: #f59e0b;">.</span>
                </h1>

                <div style="background-color: #ffffff; padding: 32px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  <h2 style="font-size: 18px; font-weight: 800; margin-top: 0; color: #1e293b; font-style: italic; text-transform: uppercase;">Salut, ${safeName}!</h2>
                  <p style="font-size: 14px; line-height: 1.6; color: #64748b;">
                    A trecut ceva timp de la ultima ta vizită la <strong>${safeSalon}</strong>. Ai nevoie de o nouă programare pentru <strong>${safeService}</strong>?
                  </p>

                  <div style="margin-top: 28px; text-align: center;">
                    <a href="${bookingLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: 900; font-size: 12px; text-transform: uppercase; text-decoration: none; letter-spacing: 0.05em;">
                      Rezervă acum
                    </a>
                  </div>
                </div>

                <p style="text-align: center; font-size: 10px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 32px;">
                  © 2026 Chronos System • Premium Management
                </p>
              </div>
            `,
          });

          if (!dataMail.error) {
            await supabaseAdmin
              .from("client_cases")
              .update({ last_rebooking_reminder_sent: today.toISOString().split("T")[0] })
              .eq("id", client.id);
            totalSent++;
          } else {
            errors.push(`${client.client_email}: ${dataMail.error.message}`);
          }
        } catch (innerErr: any) {
          errors.push(`Client ${client.id}: ${innerErr.message}`);
        }
      }
    }

    return NextResponse.json({ sent: totalSent, errors });
  } catch (error: any) {
    console.error("Eroare reamintiri revenire:", error.message);
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 });
  }
}