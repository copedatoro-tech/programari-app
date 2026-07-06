import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ℹ️ Acest e-mail e trimis automat, fără context de utilizator logat —
// nu avem limba aleasă de client la momentul rezervării, deci folosim
// română ca limbă implicită. Poate fi extins mai târziu, salvând limba
// aleasă de client direct pe programare, în pagina de rezervare publică.
function buildReminderHtml(nume: string, data: string, ora: string, serviciu?: string) {
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
      </div>
      <p style="text-align: center; font-size: 10px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 32px;">
        © 2026 Chronos System • Premium Management
      </p>
    </div>
  `;
}

export async function GET(request: Request) {
  const receivedHeader = request.headers.get("authorization");
  const expectedHeader = `Bearer ${process.env.CRON_SECRET}`;
  console.log("DEBUG primit:", JSON.stringify(receivedHeader));
  console.log("DEBUG asteptat:", JSON.stringify(expectedHeader));

  // ✅ Verificare de securitate — doar Vercel Cron (cu secretul corect) poate declanșa asta
  if (receivedHeader !== expectedHeader) {
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
    .select("id, title, prenume, nume, email, date, time, serviciu_id")
    .eq("date", tomorrowStr)
    .eq("reminder_sent", false)
    .neq("status", "cancelled")
    .not("email", "is", null);

  if (error) {
    console.error("Eroare la citirea programărilor:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ sent: 0, message: "Nicio programare de reamintit." });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const appt of appointments) {
    const clientName = appt.title || appt.prenume || appt.nume || "Client";
    try {
      const result = await resend.emails.send({
        from: "Chronos <onboarding@resend.dev>",
        to: [appt.email as string],
        subject: "Reamintire Programare • Chronos System",
        html: buildReminderHtml(clientName, appt.date, appt.time),
      });
      if (result.error) {
        errors.push(`${appt.id}: ${result.error.message}`);
        continue;
      }
      await supabaseAdmin.from("appointments").update({ reminder_sent: true }).eq("id", appt.id);
      sent++;
    } catch (e: any) {
      errors.push(`${appt.id}: ${e?.message || "eroare necunoscută"}`);
    }
  }

  return NextResponse.json({ sent, total: appointments.length, errors });
}