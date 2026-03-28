import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Inițializare securizată în interiorul rutei
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { email, nume, data, ora } = await request.json();

    // Verificări de siguranță pentru datele de intrare
    if (!email) {
      return NextResponse.json({ error: "Eroare: Adresa de email lipsește." }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Eroare Configurare: API Key Resend lipsește din server." }, { status: 500 });
    }

    // Trimiterea e-mailului cu branding Chronos
    const dataMail = await resend.emails.send({
      from: 'Chronos <onboarding@resend.dev>', // Notă: După ce configurezi domeniul, schimbă aici
      to: [email],
      subject: 'Confirmare Programare • Chronos System',
      html: `
        <div style="font-family: 'Helvetica', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #0f172a; background-color: #f8fafc; border-radius: 24px;">
          <h1 style="font-size: 24px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.05em; margin-bottom: 24px;">
            CHRONOS<span style="color: #f59e0b;">.</span>
          </h1>
          
          <div style="background-color: #ffffff; padding: 32px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="font-size: 18px; font-weight: 800; margin-top: 0; color: #1e293b; font-style: italic; text-transform: uppercase;">Salut, ${nume}!</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #64748b;">Vă confirmăm că programarea dumneavoastră a fost înregistrată cu succes în sistemul nostru.</p>
            
            <div style="margin: 24px 0; padding: 20px; background-color: #fef3c7; border-radius: 16px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 12px; font-weight: 900; text-transform: uppercase; color: #92400e; letter-spacing: 0.1em;">Detalii Programare</p>
              <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">📅 Data: ${data}</p>
              <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">⏰ Ora: ${ora}</p>
            </div>
            
            <p style="font-size: 13px; font-weight: 600; font-style: italic; color: #475569; margin-bottom: 0;">Vă așteptăm cu drag!</p>
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