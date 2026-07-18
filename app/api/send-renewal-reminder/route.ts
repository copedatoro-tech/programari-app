import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, nume, dataReinnoire, suma, currency, manageUrl } = await req.json();

    if (!email || !dataReinnoire) {
      return NextResponse.json({ error: "Date incomplete." }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("Lipseste RESEND_API_KEY.");
      return NextResponse.json({ error: "Configurare server incompleta." }, { status: 500 });
    }

    const dataFormatata = new Date(dataReinnoire).toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #0f172a;">Abonamentul tau Chronos se reinnoieste in curand</h2>
        <p>Buna${nume ? `, ${nume}` : ""},</p>
        <p>
          Iti reamintim ca abonamentul tau Chronos se va reinnoi automat pe
          <strong>${dataFormatata}</strong>, in valoare de <strong>${suma} ${currency}</strong>.
        </p>
        <p>
          Nu trebuie sa faci nimic daca vrei sa continui sa folosesti Chronos — plata se proceseaza automat,
          pe cardul salvat.
        </p>
        <p>
          Daca vrei sa schimbi planul sau sa anulezi abonamentul inainte de reinnoire, o poti face oricand,
          fara sa ne contactezi:
        </p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${manageUrl}" style="background: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold;">
            Gestioneaza abonamentul
          </a>
        </p>
        <p style="color: #64748b; font-size: 13px;">
          Multumim ca folosesti Chronos.
        </p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Chronos <notificari@programari-app.vercel.app>",
        to: email,
        subject: `Abonamentul tau se reinnoieste pe ${dataFormatata}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Eroare Resend:", errText);
      return NextResponse.json({ error: "Eroare la trimiterea email-ului." }, { status: 500 });
    }

    return NextResponse.json({ sent: true });

  } catch (err: any) {
    console.error("Eroare send-renewal-reminder:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}