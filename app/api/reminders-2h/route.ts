import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAndConsumeWhatsAppQuota } from "@/lib/whatsappQuota";

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "40" + digits.slice(1);
  if (!digits.startsWith("40") && digits.length === 9) digits = "40" + digits;
  return digits.length >= 10 ? digits : null;
}

// ✅ Ruta trebuie apelată des (ex: la fiecare 30 min), NU o dată pe zi, ca reamintirea
// de o zi înainte — altfel fereastra de "2 ore înainte" ar putea fi ratată complet.
// Trimite DOAR pentru saloanele care au activat explicit această opțiune în Settings
// (implicit dezactivată — nimeni nu primește mesaje în plus fără să ceară).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 1.5 * 60 * 60 * 1000); // 1h30 de-acum
  const windowEnd = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);   // 2h30 de-acum
  // ✅ Fereastră de 1 oră (nu un moment exact), ca să nu ratăm programări din cauza
  // intervalului dintre rulările cron-ului

  const todayStr = now.toISOString().split("T")[0];
  const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: appointments, error } = await supabaseAdmin
    .from("appointments")
    .select("id, title, prenume, nume, phone, date, time, user_id, reminder_2h_sent, total_price, amount_paid, payment_status")
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
    .select("id, plan_type, reminder_2h_enabled")
    .in("id", userIds);

  const profileByUser: Record<string, any> = {};
  (profiles || []).forEach((p) => { profileByUser[p.id] = p; });

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  let sent = 0;
  const errors: string[] = [];

  for (const appt of inWindow) {
    const profile = profileByUser[appt.user_id];
    if (!profile?.reminder_2h_enabled) continue; // ✅ doar cine a activat explicit opțiunea

    const plan = (profile.plan_type || "").toUpperCase();
    if (!plan.includes("ELITE") && !plan.includes("TEAM")) continue;
    if (!appt.phone) continue;

    const quota = await checkAndConsumeWhatsAppQuota(appt.user_id, plan);
    if (!quota.allowed) { errors.push(`${appt.id}: cotă epuizată`); continue; }

    const to = normalizePhone(appt.phone);
    if (!to) continue;

    const clientName = appt.title || appt.prenume || appt.nume || "Client";

    try {
      const res = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: "reminder_programare_2h",
            language: { code: "ro" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: clientName },
                  { type: "text", text: appt.time },
                ],
              },
            ],
          },
        }),
      });

      if (res.ok) {
        await supabaseAdmin.from("appointments").update({ reminder_2h_sent: true }).eq("id", appt.id);
        sent++;
      } else {
        const errData = await res.json().catch(() => ({}));
        errors.push(`${appt.id}: ${errData?.error?.message || res.statusText}`);
      }
    } catch (e: any) {
      errors.push(`${appt.id}: ${e.message}`);
    }
  }

  return NextResponse.json({ sent, errors });
}