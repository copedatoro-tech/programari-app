import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { checkAndConsumeWhatsAppQuota } from "@/lib/whatsappQuota";
import { getBusinessWhatsAppCredentials, normalizePhone, type WhatsAppCredentialsResult } from "@/lib/businessWhatsApp";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendWhatsAppRebookingReminder(
  whatsapp: Extract<WhatsAppCredentialsResult, { ok: true }>,
  phone: string,
  clientName: string,
  salonName: string,
  serviceName: string,
  bookingLink: string,
) {
  const to = normalizePhone(phone);
  if (!to) return { ok: false, error: `Număr de telefon invalid: "${phone}"` };

  try {
    const res = await fetch(`https://graph.facebook.com/v23.0/${whatsapp.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${whatsapp.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "rebooking_reminder",
          language: { code: whatsapp.language },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: clientName },
              { type: "text", text: salonName },
              { type: "text", text: serviceName },
              { type: "text", text: bookingLink },
            ],
          }],
        },
      }),
    });

    const json = await res.json();
    if (!res.ok) return { ok: false, error: json?.error?.message || `HTTP ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "eroare de rețea necunoscută" };
  }
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
// Canalele de trimitere sunt configurabile: e-mail, WhatsApp sau ambele.
// WhatsApp folosește numărul conectat al punctului de lucru din ultima programare.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
    }

    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    const { data: eligibleProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, slug, full_name, plan_type, rebooking_reminder_enabled, rebooking_reminder_days, rebooking_reminder_email_enabled, rebooking_reminder_whatsapp_enabled")
      .eq("rebooking_reminder_enabled", true);

    if (!eligibleProfiles || eligibleProfiles.length === 0) {
      return NextResponse.json({ message: "Niciun salon cu funcția activată.", sent: 0 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.chronosproductivity.com";
    let totalSent = 0;
    let sentEmail = 0;
    let sentWhatsapp = 0;
    const errors: string[] = [];
    const whatsappByUserAndLocation: Record<string, WhatsAppCredentialsResult> = {};

    for (const profile of eligibleProfiles) {
      const plan = (profile.plan_type || "").toUpperCase();
      if (!plan.includes("ELITE") && !plan.includes("TEAM") && !plan.includes("BUSINESS")) continue; // functie disponibila doar ELITE/TEAM
      if (!profile.slug) continue; // fără pagină publică, nu are rost linkul
      const emailEnabled = profile.rebooking_reminder_email_enabled !== false;
      const whatsappEnabled = !!profile.rebooking_reminder_whatsapp_enabled;
      if (!emailEnabled && !whatsappEnabled) continue;

      const defaultDays = profile.rebooking_reminder_days || 30;
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const { data: clients } = await supabaseAdmin
        .from("client_cases")
        .select("id, client_name, client_email, phone_number, last_rebooking_reminder_sent, last_rebooking_email_sent, last_rebooking_whatsapp_sent")
        .eq("user_id", profile.id);

      if (!clients || clients.length === 0) continue;

      for (const client of clients) {
        try {
          if (emailEnabled && !resend) {
            errors.push(`[email] ${profile.id}: RESEND_API_KEY lipsește.`);
          }
          if (!client.phone_number) continue;

          // ✅ Aducem TOATE programările trecute ale clientului, cronologic —
          // nu doar ultima, ca să putem calcula intervalul mediu real
          const { data: apptsData } = await supabaseAdmin
            .from("appointments")
            .select("date, nume_serviciu, work_location_id")
            .eq("user_id", profile.id)
            .eq("phone", client.phone_number)
            .neq("status", "cancelled")
            .order("date", { ascending: true });

          if (!apptsData || apptsData.length === 0) continue;

          const pastAppts = apptsData.filter((a) => a.date && new Date(a.date) <= today);
          const hasFutureAppt = apptsData.some((a) => a.date && new Date(a.date) > today);

          if (pastAppts.length === 0 || hasFutureAppt) continue; // are deja o programare viitoare, sărim

          const lastPastDate = pastAppts[pastAppts.length - 1].date as string;
          const lastPastAppt = pastAppts[pastAppts.length - 1];

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

          const legacySent = client.last_rebooking_reminder_sent && client.last_rebooking_reminder_sent >= lastPastDate;
          const emailAlreadySent = legacySent || (client.last_rebooking_email_sent && client.last_rebooking_email_sent >= lastPastDate);
          const whatsappAlreadySent = client.last_rebooking_whatsapp_sent && client.last_rebooking_whatsapp_sent >= lastPastDate;
          if ((!emailEnabled || emailAlreadySent || !client.client_email) && (!whatsappEnabled || whatsappAlreadySent || !client.phone_number)) continue;

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

          let emailSentNow = false;
          let whatsappSentNow = false;

          if (emailEnabled && !emailAlreadySent && client.client_email && resend) {
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
              emailSentNow = true;
              sentEmail++;
              totalSent++;
            } else {
              errors.push(`[email] ${client.client_email}: ${dataMail.error.message}`);
            }
          }

          if (whatsappEnabled && !whatsappAlreadySent && client.phone_number) {
            const whatsappKey = `${profile.id}:${lastPastAppt.work_location_id || "__default__"}`;
            if (!whatsappByUserAndLocation[whatsappKey]) {
              whatsappByUserAndLocation[whatsappKey] = await getBusinessWhatsAppCredentials(profile.id, null, lastPastAppt.work_location_id);
            }
            const whatsapp = whatsappByUserAndLocation[whatsappKey];
            if (!whatsapp?.ok) {
              errors.push(`[whatsapp] ${client.id}: ${whatsapp?.reason || "business_whatsapp_not_connected"}`);
            } else {
              const quota = await checkAndConsumeWhatsAppQuota(profile.id, plan);
              if (!quota.allowed) {
                errors.push(`[whatsapp] ${client.id}: cotă lunară epuizată (${quota.reason})`);
              } else {
                const waResult = await sendWhatsAppRebookingReminder(
                  whatsapp,
                  client.phone_number,
                  client.client_name || "Client",
                  profile.full_name || "Chronos",
                  topService || "o nouă vizită",
                  bookingLink,
                );
                if (waResult.ok) {
                  whatsappSentNow = true;
                  sentWhatsapp++;
                  totalSent++;
                } else {
                  errors.push(`[whatsapp] ${client.id}: ${waResult.error}`);
                }
              }
            }
          }

          const updates: Record<string, string> = {};
          if (emailSentNow) updates.last_rebooking_email_sent = todayStr;
          if (whatsappSentNow) updates.last_rebooking_whatsapp_sent = todayStr;
          if ((emailSentNow || emailAlreadySent || !emailEnabled || !client.client_email)
            && (whatsappSentNow || whatsappAlreadySent || !whatsappEnabled || !client.phone_number)) {
            updates.last_rebooking_reminder_sent = todayStr;
          }
          if (Object.keys(updates).length > 0) {
            await supabaseAdmin.from("client_cases").update(updates).eq("id", client.id);
          }
        } catch (innerErr: any) {
          errors.push(`Client ${client.id}: ${innerErr.message}`);
        }
      }
    }

    return NextResponse.json({ sent: totalSent, sentEmail, sentWhatsapp, errors });
  } catch (error: any) {
    console.error("Eroare reamintiri revenire:", error.message);
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 });
  }
}
