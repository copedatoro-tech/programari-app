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
    const { phone, nume, data, ora, adminId, paymentStatus, amountRemaining } = await request.json();

    if (!phone || !nume || !data || !ora || !adminId) {
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

    const to = normalizePhone(phone);
    if (!to) {
      return NextResponse.json({ error: `Număr de telefon invalid: "${phone}"` }, { status: 400 });
    }

    // ✅ Dacă rezervarea a fost plătită doar parțial (avans), folosim un șablon
    // diferit, care include și suma rămasă de plătit la salon. Pentru plată
    // integrală sau fără plată online, folosim șablonul obișnuit, neschimbat.
    const isDeposit = paymentStatus === "deposit_paid" && amountRemaining > 0;

    const template = isDeposit
      ? {
          name: "confirmare_programare_avans",
          parameters: [
            { type: "text", text: nume },
            { type: "text", text: data },
            { type: "text", text: ora },
            { type: "text", text: String(amountRemaining) },
          ],
        }
      : {
          name: "confirmare_programare",
          parameters: [
            { type: "text", text: nume },
            { type: "text", text: data },
            { type: "text", text: ora },
          ],
        };

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
          name: template.name,
          language: { code: "ro" },
          components: [{ type: "body", parameters: template.parameters }],
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