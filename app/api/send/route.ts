import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  // Inițializare securizată în interiorul rutei
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { appointmentId } = await request.json();

    // 🔒 FIX SECURITATE: ruta accepta anterior { email, nume, data, ora }
    // trimise direct de client, fara nicio verificare — oricine putea trimite
    // un request catre acest endpoint cu orice adresa de email dorea, folosind
    // Chronos ca "relay" de spam. Acum "appointmentId" e OBLIGATORIU, iar
    // toate datele (email, nume, data, ora) se citesc DIN BAZA DE DATE, nu
    // din request — clientul nu mai poate alege catre cine se trimite.
    if (!appointmentId) {
      return NextResponse.json({ error: "Eroare: appointmentId lipsește." }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Eroare Configurare: API Key Resend lipsește din server." }, { status: 500 });
    }

    const { data: appointment, error: apptError } = await supabaseAdmin
      .from("appointments")
      .select("email, prenume, nume, date, time, user_id")
      .eq("id", appointmentId)
      .maybeSingle();

    if (apptError || !appointment) {
      return NextResponse.json({ error: "Programare inexistentă." }, { status: 404 });
    }
    if (!appointment.email) {
      return NextResponse.json({ error: "Programarea nu are o adresă de email asociată." }, { status: 400 });
    }

    const manageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/gestioneaza/${appointmentId}`;
    let responsiblePhone = "";
    if (appointment.user_id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("phone")
        .eq("id", appointment.user_id)
        .maybeSingle();
      responsiblePhone = profile?.phone || "";
    }

    const displayName = appointment.prenume
      ? `${appointment.prenume} ${appointment.nume || ""}`.trim()
      : appointment.nume || "";

    const safeName = escapeHtml(displayName);
    const safeDate = escapeHtml(appointment.date);
    const safeTime = escapeHtml(appointment.time);
    const safeResponsiblePhone = escapeHtml(responsiblePhone);

    // Trimiterea e-mailului cu branding Chronos
    const dataMail = await resend.emails.send({
      from: 'Chronos <onboarding@resend.dev>', // Notă: După ce configurezi domeniul, schimbă aici
      to: [appointment.email],
      subject: 'Confirmare Programare • Chronos System',
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
            <p style="font-size: 14px; line-height: 1.6; color: #64748b;">Vă confirmăm că programarea dumneavoastră a fost înregistrată cu succes în sistemul nostru.</p>
            
            <div style="margin: 24px 0; padding: 20px; background-color: #fef3c7; border-radius: 16px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 12px; font-weight: 900; text-transform: uppercase; color: #92400e; letter-spacing: 0.1em;">Detalii Programare</p>
              <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">📅 Data: ${safeDate}</p>
              <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">⏰ Ora: ${safeTime}</p>
            </div>
            
            <p style="font-size: 13px; font-weight: 600; font-style: italic; color: #475569; margin-bottom: 0;">Vă așteptăm cu drag!</p>

            <div style="margin-top: 28px; text-align: center;">
              <a href="${manageUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 28px; border-radius: 14px; font-weight: 900; font-size: 12px; text-transform: uppercase; text-decoration: none; letter-spacing: 0.05em;">
                Gestionează Programarea
              </a>
              <p style="font-size: 10px; color: #94a3b8; margin-top: 10px;">Poți anula sau reprograma oricând, direct de aici.</p>
            </div>
            ${safeResponsiblePhone ? `
            <div style="margin-top: 22px; padding: 16px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #475569; letter-spacing: 0.08em;">Contact rapid</p>
              <p style="margin: 6px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">Pentru modificări urgente, contactează persoana responsabilă la <strong style="color:#0f172a;">${safeResponsiblePhone}</strong>.</p>
            </div>
            ` : ""}
          </div>
          
          <p style="text-align: center; font-size: 10px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 32px;">
            © 2026 Chronos System • Premium Management
          </p>
        </div>
      `,
    });
    if (dataMail.error) {
      console.error("RESEND API ERROR:", dataMail.error);
      return NextResponse.json({ error: dataMail.error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true, id: dataMail.data?.id });
  } catch (error: any) {
    console.error("SERVER CRITICAL ERROR (RESEND):", error.message);
    return NextResponse.json({ error: "Eroare internă la trimiterea mail-ului." }, { status: 500 });
  }
}