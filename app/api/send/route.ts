import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Mutăm inițializarea AICI, în interiorul funcției
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { email, nume, data, ora } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Lipsă email" }, { status: 400 });
    }

    const dataMail = await resend.emails.send({
      from: 'Chronos <onboarding@resend.dev>',
      to: [email],
      subject: 'Confirmare Programare - Chronos',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #d97706;">Salut, ${nume}!</h2>
          <p>Programarea ta a fost confirmată cu succes.</p>
          <hr />
          <p><strong>Data:</strong> ${data}</p>
          <p><strong>Ora:</strong> ${ora}</p>
          <hr />
          <p>Te așteptăm cu drag!</p>
        </div>
      `,
    });

    return NextResponse.json(dataMail);
  } catch (error) {
    return NextResponse.json({ error: "Eroare la trimitere" }, { status: 500 });
  }
}