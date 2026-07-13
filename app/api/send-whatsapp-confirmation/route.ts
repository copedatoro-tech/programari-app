import { NextResponse } from "next/server";

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
    const { phone, nume, data, ora } = await request.json();

    if (!phone || !nume || !data || !ora) {
      return NextResponse.json({ error: "Date lipsă." }, { status: 400 });
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
                { type: "text", text: nume },
                { type: "text", text: data },
                { type: "text", text: ora },
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