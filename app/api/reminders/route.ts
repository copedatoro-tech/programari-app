import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkAndConsumeWhatsAppQuota } from "@/lib/whatsappQuota";

// ℹ️ Acest e-mail e trimis automat, fără context de utilizator logat —
// nu avem limba aleasă de client la momentul rezervării, deci folosim
// română ca limbă implicită. Poate fi extins mai târziu, salvând limba
// aleasă de client direct pe programare, în pagina de rezervare publică.
function buildReminderHtml(nume: string, data: string, ora: string, appointmentId: string, serviciu?: string) {
  const manageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/gestioneaza/${appointmentId}`;
  return `
    <div style="font-family: 'Helvetica', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #0f172a; background-color: #f8fafc; border-radius: 24px;">
      <h1 style="font-size: 24px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.05em; margin-bottom: 24px;">
        CHRONOS<span style="color: #f59e0b;">.</span>
      </h1>
      <div style="background-color: #ffffff; padding: 32px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <h2 style="font-size: 18px; font-weight: 800; margin-top: 0; color: #1e293b; font-style: italic; text-transform: uppercase;">Salut, ${nume}!</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #64748b;">Îți reamintim că ai o programare <strong>mâine</strong>.</p>
        <div style="margin: 24px 0; padding: 20px; background-color: #fef3c7; border-radius: 16px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; font-size: 12px; font-weight: 900; text-transform: uppercase; color: #92400e; letter-spacing: 0.1em;">Detalii Programare</p>
          <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">📅 Data: ${data}</p>
          <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">⏰ Ora: ${ora}</p>
          ${serviciu ? `<p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">✂️ Serviciu: ${serviciu}</p>` : ""}
        </div>
        <p style="font-size: 13px; font-weight: 600; font-style: italic; color: #475569; margin-bottom: 0;">Te așteptăm cu drag!</p>

        <div style="margin-top: 28px; text-align: center;">
          <a href="${manageUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: 900; font-size: 12px; text-transform: uppercase; text-decoration: none; letter-spacing: 0.05em;">
            Gestionează Programarea
          </a>
          <p style="font-size: 10px; color: #94a3b8; margin-top: 10px;">Poți anula sau reprograma oricând, direct de aici.</p>
        </div>
      </div>
      <p style="text-align: center; font-size: 10px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 32px;">
        © 2026 Chronos System • Premium Management
      </p>
    </div>
  `;
}

// 📱 Normalizează numărul de telefon la formatul cerut de WhatsApp Graph API
// (fără spații, fără liniuțe, fără "+", dar cu codul de țară).
// Exemple acceptate din DB: "0770833473", "+40770833473", "40 770 833 473"
function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "40" + digits.slice(1); // presupunem România dacă începe cu 0
  if (!digits.startsWith("40") && digits.length === 9) digits = "40" + digits; // fallback pt. numere fără prefix
  return digits.length >= 10 ? digits : null;
}

// 📲 Trimite reamintirea prin WhatsApp folosind un Message Template aprobat de Meta.
// Dacă rezervarea are un rest de plată (avans, nu integral), folosește un șablon
// separat, care include și acea sumă. Returnează { ok: true } sau { ok: false, error }.
async function sendWhatsAppReminder(phone: string, nume: string, data: string, ora: string, amountRemaining?: number) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return { ok: false, error: "WHATSAPP_PHONE_NUMBER_ID sau WHATSAPP_ACCESS_TOKEN lipsesc din .env" };
  }

  const to = normalizePhone(phone);
  if (!to) {
    return { ok: false, error: `Număr de telefon invalid: "${phone}"` };
  }

  const useDepositTemplate = amountRemaining && amountRemaining > 0;
  const templateName = useDepositTemplate ? "reminder_programare_avans" : "reminder_programare";
  const parameters = useDepositTemplate
    ? [
        { type: "text", text: nume },
        { type: "text", text: data },
        { type: "text", text: ora },
        { type: "text", text: String(amountRemaining) },
      ]
    : [
        { type: "text", text: nume },
        { type: "text", text: data },
        { type: "text", text: ora },
      ];

  try {
    const res = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: "ro" },
          components: [{ type: "body", parameters }],
        },
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      const errMsg = json?.error?.message || `HTTP ${res.status}`;
      return { ok: false, error: errMsg };
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "eroare de rețea necunoscută" };
  }
}

export async function GET(request: Request) {
  // ✅ Verificare de securitate — doar Vercel Cron (cu secretul corect) poate declanșa asta
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY lipsește." }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Calculăm data de "mâine" (format YYYY-MM-DD)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: appointments, error } = await supabaseAdmin
    .from("appointments")
    .select("id, title, prenume, nume, email, phone, date, time, serviciu_id, reminder_sent, reminder_whatsapp_sent, user_id, total_price, amount_paid, payment_status")
    .eq("date", tomorrowStr)
    .neq("status", "cancelled")
    .or("reminder_sent.eq.false,reminder_whatsapp_sent.eq.false");

  if (error) {
    console.error("Eroare la citirea programărilor:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ sentEmail: 0, sentWhatsapp: 0, message: "Nicio programare de reamintit." });
  }

  // ✅ Reamintirile WhatsApp sunt disponibile doar pentru planurile Elite și Team —
  // aducem planul fiecărui cont, o singură dată, pentru toți userii implicați
  const userIds = Array.from(new Set(appointments.map((a) => a.user_id).filter(Boolean)));
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, plan_type")
    .in("id", userIds);
  const planByUser: Record<string, string> = {};
  (profiles || []).forEach((p) => { planByUser[p.id] = (p.plan_type || "").toUpperCase(); });
  const hasWhatsAppAccess = (userId: string) => {
    const plan = planByUser[userId] || "";
    return plan.includes("ELITE") || plan.includes("TEAM");
  };

  let sentEmail = 0;
  let sentWhatsapp = 0;
  const errors: string[] = [];

  for (const appt of appointments) {
    const clientName = appt.title || appt.prenume || appt.nume || "Client";

    // --- EMAIL (neschimbat față de logica existentă) ---
    if (!appt.reminder_sent && appt.email) {
      try {
        const result = await resend.emails.send({
          from: "Chronos <onboarding@resend.dev>",
          to: [appt.email as string],
          subject: "Reamintire Programare • Chronos System",
          html: buildReminderHtml(clientName, appt.date, appt.time, appt.id),
        });
        if (result.error) {
          errors.push(`[email] ${appt.id}: ${result.error.message}`);
        } else {
          await supabaseAdmin.from("appointments").update({ reminder_sent: true }).eq("id", appt.id);
          sentEmail++;
        }
      } catch (e: any) {
        errors.push(`[email] ${appt.id}: ${e?.message || "eroare necunoscută"}`);
      }
    }

    // --- WHATSAPP (nou) — doar pentru conturi Elite/Team, cu respectarea cotei lunare ---
    if (!appt.reminder_whatsapp_sent && appt.phone && hasWhatsAppAccess(appt.user_id)) {
      const quota = await checkAndConsumeWhatsAppQuota(appt.user_id, planByUser[appt.user_id] || "");
      if (!quota.allowed) {
        errors.push(`[whatsapp] ${appt.id}: cotă lunară epuizată (${quota.reason})`);
        continue;
      }
      const remaining = appt.payment_status === "deposit_paid"
        ? Math.round(Math.max(0, (appt.total_price || 0) - (appt.amount_paid || 0)))
        : 0;
      const waResult = await sendWhatsAppReminder(appt.phone, clientName, appt.date, appt.time, remaining);
      if (waResult.ok) {
        await supabaseAdmin.from("appointments").update({ reminder_whatsapp_sent: true }).eq("id", appt.id);
        sentWhatsapp++;
      } else {
        errors.push(`[whatsapp] ${appt.id}: ${waResult.error}`);
      }
    }
  }

  return NextResponse.json({ sentEmail, sentWhatsapp, total: appointments.length, errors });
}