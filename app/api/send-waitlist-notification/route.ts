import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { email, nume, date, time, claimUrl } = await request.json();
    if (!email || !claimUrl) {
      return NextResponse.json({ error: "Date lipsă." }, { status: 400 });
    }

    const dataMail = await resend.emails.send({
      from: "Chronos <onboarding@resend.dev>",
      to: [email],
      subject: "🎉 S-a eliberat un loc!",
      html: `
        <div style="font-family: 'Helvetica', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #0f172a; background-color: #f8fafc; border-radius: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="${process.env.NEXT_PUBLIC_BASE_URL}/logo-chronos.png" alt="Chronos" width="64" height="64" style="display: inline-block;" />
          </div>
          <h1 style="font-size: 24px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -0.05em; margin-bottom: 24px; text-align: center;">
            CHRONOS<span style="color: #f59e0b;">.</span>
          </h1>
          <div style="background-color: #ffffff; padding: 32px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="font-size: 18px; font-weight: 800; margin-top: 0; color: #1e293b; font-style: italic; text-transform: uppercase;">Salut, ${nume}!</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #64748b;">Cineva tocmai a anulat o programare, iar tu ești primul pe lista de așteptare. Ai la dispoziție <strong>15 minute</strong> să confirmi acest loc, înainte să fie oferit următoarei persoane.</p>
            <div style="margin: 24px 0; padding: 20px; background-color: #fef3c7; border-radius: 16px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 12px; font-weight: 900; text-transform: uppercase; color: #92400e; letter-spacing: 0.1em;">Loc Disponibil</p>
              <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">📅 Data: ${date}</p>
              <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">⏰ Ora: ${time}</p>
            </div>
            <div style="margin-top: 28px; text-align: center;">
              <a href="${claimUrl}" style="display: inline-block; background-color: #f59e0b; color: #0f172a; padding: 16px 32px; border-radius: 14px; font-weight: 900; font-size: 13px; text-transform: uppercase; text-decoration: none; letter-spacing: 0.05em;">
                Confirmă Locul Acum
              </a>
              <p style="font-size: 10px; color: #94a3b8; margin-top: 10px;">⏱️ Ai doar 15 minute la dispoziție!</p>
            </div>
          </div>
          <p style="text-align: center; font-size: 10px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 32px;">
            © 2026 Chronos System • Premium Management
          </p>
        </div>
      `,
    });

    if (dataMail.error) {
      return NextResponse.json({ error: dataMail.error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Eroare internă." }, { status: 500 });
  }
}