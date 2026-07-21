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

// ✅ Ruta trebuie apelată des (ex: la fiecare 30 min), NU odată pe zi, ca reamintirea
// de o zi înainte — altfel fereastra de "2 ore înainte" ar putea fi ratată complet.
// Trimite DOAR pentru saloanele care au activat explicit această opțiune în Settings
// (implicit dezactivată — nimeni nu primește mesaje în plus fără să ceară).
//
// 📧 CONVERTIT PE EMAIL (2026-07): trimitea inițial pe WhatsApp Business API,
// dezactivat temporar din cauza costurilor și complexității de configurare Meta.
// Rămâne disponibil doar pentru planurile ELITE și TEAM, la fel ca înainte.
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
    .select("id, title, prenume, nume, email, date, time, user_id, reminder_2h_sent, total_price, amount_paid, payment_status")
    .in("date", [todayStr, tomorrowStr])
    .neq("status", "cancelled")
    .eq("reminder_2h_sent", false);

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
    .select("id, plan_type, reminder_2h_enabled, full_name")
    .in("id", userIds);

  const profileByUser: Record<string, any> = {};
  (profiles || []).forEach((p) => { profileByUser[p.id] = p; });

  let sent = 0;
  const errors: string[] = [];

  for (const appt of inWindow) {
    const profile = profileByUser[appt.user_id];
    if (!profile?.reminder_2h_enabled) continue; // doar cine a activat explicit opțiunea

    const plan = (profile.plan_type || "").toUpperCase();
    if (!plan.includes("ELITE") && !plan.includes("TEAM")) continue; // functie disponibila doar ELITE/TEAM
    if (!appt.email) continue; // fără email, nu avem cum trimite

    const clientName = appt.title || appt.prenume || appt.nume || "Client";
    const safeName = escapeHtml(clientName);
    const safeTime = escapeHtml(appt.time);
    const safeSalon = escapeHtml(profile.full_name || "Chronos");

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
            </div>

            <p style="text-align: center; font-size: 10px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 32px;">
              © 2026 Chronos System • Premium Management
            </p>
          </div>
        `,
      });

      if (!dataMail.error) {
        await supabaseAdmin.from("appointments").update({ reminder_2h_sent: true }).eq("id", appt.id);
        sent++;
      } else {
        errors.push(`${appt.id}: ${dataMail.error.message}`);
      }
    } catch (e: any) {
      errors.push(`${appt.id}: ${e.message}`);
    }
  }

  return NextResponse.json({ sent, errors });
}