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

// ✅ Ruta trebuie apelată des (ex: la fiecare 30 min), NU odată pe zi, ca reamintirea
// de o zi înainte — altfel fereastra de "2 ore înainte" ar putea fi ratată complet.
// Trimite DOAR pentru saloanele care au activat explicit această opțiune în Settings
// (implicit dezactivată — nimeni nu primește mesaje în plus fără să ceară).
//
async function sendWhatsApp2hReminder(
  whatsapp: Extract<WhatsAppCredentialsResult, { ok: true }>,
  phone: string,
  nume: string,
  data: string,
  ora: string,
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
          name: "reminder_programare",
          language: { code: whatsapp.language },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: nume },
              { type: "text", text: data },
              { type: "text", text: ora },
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

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Eroare Configurare: API Key Resend lipsește din server." }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.chronosproductivity.com";

  const now = new Date();
  const windowStart = new Date(now.getTime() + 1.5 * 60 * 60 * 1000); // 1h30 de-acum
  const windowEnd = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);   // 2h30 de-acum
  // ✅ Fereastră de 1 oră (nu un moment exact), ca să nu ratăm programări din cauza
  // intervalului dintre rulările cron-ului

  const todayStr = now.toISOString().split("T")[0];
  const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: appointments, error } = await supabaseAdmin
    .from("appointments")
    .select("id, title, prenume, nume, email, phone, date, time, user_id, reminder_2h_sent, reminder_2h_email_sent, reminder_2h_whatsapp_sent, total_price, amount_paid, payment_status, work_location_id, work_location_name, work_location_address, work_location_maps_url")
    .in("date", [todayStr, tomorrowStr])
    .neq("status", "cancelled")
    .or("reminder_2h_email_sent.eq.false,reminder_2h_whatsapp_sent.eq.false");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ sent: 0, message: "Nicio programare în fereastra de 2 ore." });
  }

  // ✅ Filtrăm precis, verificând ora exactă a fiecărei programări față de fereastră
  const inWindow = appointments.filter((a) => {
    if (!a.date || !a.time) return false;
    const apptDateTime = new Date(`${a.date}T${a.time}:00`);
    return apptDateTime >= windowStart && apptDateTime <= windowEnd;
  });

  if (inWindow.length === 0) {
    return NextResponse.json({ sent: 0, message: "Nicio programare exact în fereastra de 2 ore." });
  }

  const userIds = Array.from(new Set(inWindow.map((a) => a.user_id).filter(Boolean)));
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, plan_type, reminder_2h_enabled, reminder_2h_email_enabled, reminder_2h_whatsapp_enabled, full_name")
    .in("id", userIds);

  const profileByUser: Record<string, any> = {};
  (profiles || []).forEach((p) => { profileByUser[p.id] = p; });

  let sent = 0;
  let sentEmail = 0;
  let sentWhatsapp = 0;
  const errors: string[] = [];
  const whatsappByUserAndLocation: Record<string, WhatsAppCredentialsResult> = {};

  for (const appt of inWindow) {
    const profile = profileByUser[appt.user_id];
    if (!profile?.reminder_2h_enabled) continue; // doar cine a activat explicit opțiunea

    const plan = (profile.plan_type || "").toUpperCase();
    if (!plan.includes("ELITE") && !plan.includes("TEAM") && !plan.includes("BUSINESS")) continue; // functie disponibila doar ELITE/TEAM

    const clientName = appt.title || appt.prenume || appt.nume || "Client";
    const safeName = escapeHtml(clientName);
    const safeTime = escapeHtml(appt.time);
    const safeSalon = escapeHtml(profile.full_name || "Chronos");
    const safeLocationName = appt.work_location_name ? escapeHtml(appt.work_location_name) : "";
    const safeLocationAddress = appt.work_location_address ? escapeHtml(appt.work_location_address) : "";
    const mapsUrl = appt.work_location_maps_url || (appt.work_location_address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.work_location_address)}` : "");

    const emailEnabled = profile.reminder_2h_email_enabled !== false;
    const whatsappEnabled = !!profile.reminder_2h_whatsapp_enabled;
    let emailSentNow = false;
    let whatsappSentNow = false;

    if (emailEnabled && !appt.reminder_2h_email_sent && appt.email) {
      try {
      const dataMail = await resend.emails.send({
        from: "Chronos <notificari@chronosproductivity.com>",
        to: [appt.email],
        subject: `Reamintire: programarea ta de azi la ora ${safeTime}`,
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
              <p style="font-size: 14px; line-height: 1.6; color: #64748b;">Îți reamintim că ai o programare astăzi la <strong>${safeSalon}</strong>.</p>

              <div style="margin: 24px 0; padding: 20px; background-color: #fef3c7; border-radius: 16px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 12px; font-weight: 900; text-transform: uppercase; color: #92400e; letter-spacing: 0.1em;">Programarea ta</p>
                <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">⏰ Ora: ${safeTime}</p>
              </div>

              <p style="font-size: 13px; font-weight: 600; font-style: italic; color: #475569; margin-bottom: 0;">Te așteptăm!</p>
              ${safeLocationAddress ? `
              <div style="margin-top: 22px; padding: 16px; background-color: #eff6ff; border-radius: 16px; border: 1px solid #bfdbfe;">
                <p style="margin: 0; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1d4ed8; letter-spacing: 0.08em;">Locatie</p>
                ${safeLocationName ? `<p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 900; color: #0f172a;">${safeLocationName}</p>` : ""}
                <p style="margin: 6px 0 12px 0; font-size: 13px; line-height: 1.5; color: #334155;"><strong style="color:#0f172a;">${safeLocationAddress}</strong></p>
                <a href="${mapsUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 12px; font-weight: 900; font-size: 11px; text-transform: uppercase; text-decoration: none;">Deschide in Google Maps</a>
              </div>
              ` : ""}
            </div>

            <p style="text-align: center; font-size: 10px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 32px;">
              © 2026 Chronos System • Premium Management
            </p>
          </div>
        `,
      });

      if (!dataMail.error) {
        await supabaseAdmin.from("appointments").update({ reminder_2h_email_sent: true }).eq("id", appt.id);
        sent++;
        sentEmail++;
        emailSentNow = true;
      } else {
        errors.push(`[email] ${appt.id}: ${dataMail.error.message}`);
      }
    } catch (e: any) {
      errors.push(`[email] ${appt.id}: ${e.message}`);
      }
    }

    if (whatsappEnabled && !appt.reminder_2h_whatsapp_sent && appt.phone) {
      const whatsappKey = `${appt.user_id}:${appt.work_location_id || "__default__"}`;
      if (!whatsappByUserAndLocation[whatsappKey]) {
        whatsappByUserAndLocation[whatsappKey] = await getBusinessWhatsAppCredentials(appt.user_id, null, appt.work_location_id);
      }
      const whatsapp = whatsappByUserAndLocation[whatsappKey];
      if (!whatsapp?.ok) {
        errors.push(`[whatsapp] ${appt.id}: ${whatsapp?.reason || "business_whatsapp_not_connected"}`);
      } else {
        const quota = await checkAndConsumeWhatsAppQuota(appt.user_id, plan);
        if (!quota.allowed) {
          errors.push(`[whatsapp] ${appt.id}: cotă lunară epuizată (${quota.reason})`);
        } else {
          const waResult = await sendWhatsApp2hReminder(whatsapp, appt.phone, clientName, appt.date, appt.time);
          if (waResult.ok) {
            await supabaseAdmin.from("appointments").update({ reminder_2h_whatsapp_sent: true }).eq("id", appt.id);
            sent++;
            sentWhatsapp++;
            whatsappSentNow = true;
          } else {
            errors.push(`[whatsapp] ${appt.id}: ${waResult.error}`);
          }
        }
      }
    }

    const emailDone = !emailEnabled || !!appt.reminder_2h_email_sent || emailSentNow || !appt.email;
    const whatsappDone = !whatsappEnabled || !!appt.reminder_2h_whatsapp_sent || whatsappSentNow || !appt.phone;
    if (emailDone && whatsappDone) {
      await supabaseAdmin.from("appointments").update({ reminder_2h_sent: true }).eq("id", appt.id);
    }
  }

  return NextResponse.json({ sent, sentEmail, sentWhatsapp, errors });
}
