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

export async function POST(request: Request) {
  try {
    const { appointmentId, adminId } = await request.json();

    // 🔒 FIX SECURITATE: ruta accepta anterior { phone, nume, data, ora, adminId }
    // trimise direct de client — oricine care ghicea/afla un adminId valid
    // putea consuma cota lunara de WhatsApp trimitand mesaje catre orice numar,
    // fara nicio legatura cu o programare reala. Acum "appointmentId" e
    // OBLIGATORIU, iar telefonul/numele/data/ora se citesc DIN BAZA DE DATE,
    // plus se verifica explicit ca programarea chiar apartine acelui adminId.
    if (!appointmentId || !adminId) {
      return NextResponse.json({ error: "Date lipsă." }, { status: 400 });
    }

    // ✅ Confirmarea WhatsApp e disponibilă doar pentru planurile Elite și Team
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan_type")
      .eq("id", adminId)
      .maybeSingle();

    const plan = (profile?.plan_type || "").toUpperCase();
    const hasAccess = plan.includes("ELITE") || plan.includes("TEAM");

    if (!hasAccess) {
      // Nu e o eroare reală — doar salonul nu are planul necesar. Răspundem
      // liniștit, ca să nu declanșăm alarme false în consola clientului.
      return NextResponse.json({ skipped: true, reason: "plan_not_eligible" });
    }

    // 🔒 Citim programarea DIN DB și verificăm că aparține chiar acestui
    // admin — altfel cineva ar putea folosi propriul plan Elite/Team valid
    // (adminId corect) ca să trimită confirmări pentru appointmentId-uri
    // care nu-i aparțin.
    const { data: appointment, error: apptError } = await supabaseAdmin
      .from("appointments")
      .select("phone, prenume, nume, date, time, user_id")
      .eq("id", appointmentId)
      .maybeSingle();

    if (apptError || !appointment) {
      return NextResponse.json({ error: "Programare inexistentă." }, { status: 404 });
    }
    if (appointment.user_id !== adminId) {
      return NextResponse.json({ error: "Programarea nu aparține acestui cont." }, { status: 403 });
    }
    if (!appointment.phone) {
      return NextResponse.json({ error: "Programarea nu are un număr de telefon asociat." }, { status: 400 });
    }

    // ✅ Team = nelimitat. Elite = plafon lunar de 300 mesaje (reamintiri + confirmări, combinate)
    const quota = await checkAndConsumeWhatsAppQuota(adminId, plan);
    if (!quota.allowed) {
      return NextResponse.json({ skipped: true, reason: quota.reason });
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json({ error: "WhatsApp neconfigurat." }, { status: 500 });
    }

    const to = normalizePhone(appointment.phone);
    if (!to) {
      return NextResponse.json({ error: `Număr de telefon invalid: "${appointment.phone}"` }, { status: 400 });
    }

    const displayName = appointment.prenume
      ? `${appointment.prenume} ${appointment.nume || ""}`.trim()
      : appointment.nume || "";

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
          name: "confirmare_programare",
          language: { code: "ro" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: displayName },
                { type: "text", text: appointment.date },
                { type: "text", text: appointment.time },
              ],
            },
          ],
        },
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error("WhatsApp confirmation error:", json);
      return NextResponse.json({ error: json?.error?.message || "Eroare WhatsApp." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("SERVER ERROR (WhatsApp confirmation):", error?.message);
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 });
  }
}