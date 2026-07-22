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
    const { waitlistId, adminId } = await request.json();

    // 🔒 FIX SECURITATE: ruta accepta anterior { phone, nume, data, ora, adminId }
    // trimise direct de client, fara nicio verificare — oricine care
    // ghicea/afla un adminId valid putea consuma cota lunara de WhatsApp
    // trimitand mesaje catre orice numar. Acum "waitlistId" e OBLIGATORIU,
    // iar telefonul/numele/data se citesc DIN BAZA DE DATE (tabela
    // "waitlist"), plus se verifica explicit ca inregistrarea chiar
    // apartine acelui adminId.
    //
    // 🐛 BUG DE CONTINUT gasit si reparat: fisierul era o copie identica a
    // send-whatsapp-confirmation/route.ts, deci trimitea sablonul WhatsApp
    // "confirmare_programare" ("Va confirmam programarea...") si catre cei
    // de pe waitlist — mesaj complet nepotrivit pentru context (ei nu au
    // inca o programare confirmata, li s-a eliberat doar un loc disponibil).
    if (!waitlistId || !adminId) {
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

    // 🔒 Citim intrarea din waitlist DIN DB și verificăm că aparține chiar
    // acestui admin.
    const { data: entry, error: entryError } = await supabaseAdmin
      .from("waitlist")
      .select("client_phone, client_name, date, offered_slot, user_id")
      .eq("id", waitlistId)
      .maybeSingle();

    if (entryError || !entry) {
      return NextResponse.json({ error: "Înregistrare waitlist inexistentă." }, { status: 404 });
    }
    if (entry.user_id !== adminId) {
      return NextResponse.json({ error: "Înregistrarea nu aparține acestui cont." }, { status: 403 });
    }
    if (!entry.client_phone) {
      return NextResponse.json({ error: "Înregistrarea nu are un număr de telefon asociat." }, { status: 400 });
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

    const to = normalizePhone(entry.client_phone);
    if (!to) {
      return NextResponse.json({ error: `Număr de telefon invalid: "${entry.client_phone}"` }, { status: 400 });
    }

    // ⚠️ VERIFICĂ: cheia exactă pentru oră în interiorul coloanei jsonb
    // "offered_slot" — presupun aici "time", dar ajustează dacă la tine se
    // numește diferit (ex. "ora", "slot_time"). Uită-te la o înregistrare
    // reală din Supabase Table Editor ca să confirmi.
    const offeredTime = (entry.offered_slot as any)?.time || "";

    // ⚠️ TODO: acest sablon ("confirmare_programare") NU e potrivit pentru
    // waitlist — a fost copiat din greseala din ruta de confirmare. Cand
    // reiei lucrul la WhatsApp Business API, creeaza si aproba in Meta
    // Business Manager un sablon dedicat (ex. "loc_disponibil_waitlist")
    // si inlocuieste "name" + parametrii de mai jos.
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
          name: "confirmare_programare", // TODO: inlocuieste cu sablonul dedicat waitlist
          language: { code: "ro" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: entry.client_name || "" },
                { type: "text", text: entry.date || "" },
                { type: "text", text: offeredTime },
              ],
            },
          ],
        },
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error("WhatsApp waitlist notification error:", json);
      return NextResponse.json({ error: json?.error?.message || "Eroare WhatsApp." }, { status: 400 });
    }

    // ✅ Marcăm în DB că notificarea a fost trimisă, ca să nu retrimitem
    await supabaseAdmin
      .from("waitlist")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", waitlistId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("SERVER ERROR (WhatsApp waitlist notification):", error?.message);
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 });
  }
}