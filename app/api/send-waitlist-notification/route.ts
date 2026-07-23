import { Resend } from "resend";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { waitlistId, adminId } = await request.json();

    if (!waitlistId || !adminId) {
      return NextResponse.json({ error: "Date lipsă." }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Eroare Configurare: API Key Resend lipsește din server." }, { status: 500 });
    }

    const { data: entry, error: entryError } = await supabaseAdmin
      .from("waitlist")
      .select("client_email, client_name, date, offered_slot, user_id")
      .eq("id", waitlistId)
      .maybeSingle();

    if (entryError || !entry) {
      return NextResponse.json({ error: "Înregistrare waitlist inexistentă." }, { status: 404 });
    }
    if (entry.user_id !== adminId) {
      return NextResponse.json({ error: "Înregistrarea nu aparține acestui cont." }, { status: 403 });
    }
    if (!entry.client_email) {
      return NextResponse.json({ error: "Înregistrarea nu are o adresă de email asociată." }, { status: 400 });
    }

    const claimUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/confirma-loc/${waitlistId}`;
    const offeredTime = (entry.offered_slot as any)?.time || "";

    const safeName = escapeHtml(entry.client_name);
    const safeDate = escapeHtml(entry.date);
    const safeTime = escapeHtml(offeredTime);

    const dataMail = await resend.emails.send({
      from: "Chronos <onboarding@resend.dev>",
      to: [entry.client_email],
      subject: "S-a eliberat un loc pentru tine • Chronos System",
      html: `
        <div style="font-family: 'Helvetica', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #0f172a; background-color: #f8fafc; border-radius: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="${process.env.NEXT_PUBLIC_BASE_URL}/logo-chronos.png" alt="Chronos" width="64" height="64" style="display: inline-block;" />
          </div>
          <h1 style="font-size: 24px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.05em; margin-bottom: 24px; text-align: center;">
            CHRONOS<span style="color: #f59e0b;">.</span>
          </h1>

          <div style="background-color: #ffffff; padding: 32px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="font-size: 18px; font-weight: 800; margin-top: 0; color: #1e293b; font-style: italic; text-transform: uppercase;">Salut, ${safeName}!</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #64748b;">Vești bune — s-a eliberat un loc pentru programarea pe care o așteptai. Locul este rezervat pentru tine temporar, dar trebuie confirmat cât mai curând.</p>

            <div style="margin: 24px 0; padding: 20px; background-color: #fef3c7; border-radius: 16px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 12px; font-weight: 900; text-transform: uppercase; color: #92400e; letter-spacing: 0.1em;">Loc disponibil</p>
              <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">📅 Data: ${safeDate}</p>
              ${safeTime ? `<p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">⏰ Ora: ${safeTime}</p>` : ""}
            </div>

            <div style="margin-top: 28px; text-align: center;">
              <a href="${claimUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: 900; font-size: 12px; text-transform: uppercase; text-decoration: none; letter-spacing: 0.05em;">
                Confirmă Locul
              </a>
              <p style="font-size: 10px; color: #94a3b8; margin-top: 10px;">Locul poate fi oferit altcuiva dacă nu confirmi la timp.</p>
            </div>
          </div>

          <p style="text-align: center; font-size: 10px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 32px;">
            © 2026 Chronos System • Premium Management
          </p>
        </div>
      `,
    });

    if (dataMail.error) {
      console.error("RESEND API ERROR (waitlist):", dataMail.error);
      return NextResponse.json({ error: dataMail.error.message }, { status: 400 });
    }

    await supabaseAdmin
      .from("waitlist")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", waitlistId);

    return NextResponse.json({ success: true, id: dataMail.data?.id });
  } catch (error: any) {
    console.error("SERVER CRITICAL ERROR (RESEND waitlist):", error.message);
    return NextResponse.json({ error: "Eroare internă la trimiterea mail-ului." }, { status: 500 });
  }
}