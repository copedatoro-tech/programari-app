import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// Webhook pentru WhatsApp Business API (Meta)
//
// Are doua roluri:
//  1) GET  - folosit O SINGURA DATA de Meta, cand configurezi endpoint-ul
//            in Meta for Developers -> WhatsApp -> Configuration -> Webhooks.
//            Meta trimite un "challenge" random si asteapta sa il primeasca
//            inapoi neschimbat, ca sa confirme ca tu detii acest URL.
//  2) POST - folosit de Meta DE FIECARE DATA cand se intampla ceva legat de
//            mesajele tale WhatsApp (livrare confirmata, citit, esuat, sau
//            un mesaj primit de la un client). Momentan doar confirmam
//            primirea (raspuns 200) fara sa procesam continutul - suficient
//            pentru cerintele Meta si pentru cazul de utilizare curent
//            (trimitem doar confirmari de programare, nu avem inca nevoie
//            sa citim raspunsuri de la clienti).
//
// Verify token-ul de mai jos TREBUIE sa fie identic cu cel introdus in
// campul "Verify token" din Meta for Developers -> Production Setup ->
// Configure Webhooks, si cu variabila WHATSAPP_WEBHOOK_VERIFY_TOKEN din
// Vercel (Settings -> Environment Variables).
// ─────────────────────────────────────────────────────────────────────────

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    // Confirmam catre Meta ca detinem acest endpoint, returnand
    // exact valoarea "challenge" primita, ca text simplu.
    return new NextResponse(challenge, { status: 200 });
  }

  // Token gresit sau parametri lipsa - respingem verificarea.
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Momentan doar logam evenimentul primit, pentru vizibilitate in
    // Vercel Logs / Sentry, fara alta procesare. Poate fi extins ulterior
    // (ex: marcarea unei confirmari WhatsApp ca "livrata" sau "citita"
    // in tabelul appointments, sau raspuns automat la mesaje primite).
    console.log("WhatsApp webhook event:", JSON.stringify(body));

    // Meta cere raspuns 200 rapid (sub cateva secunde), altfel
    // considera livrarea esuata si reincearca / dezactiveaza webhook-ul
    // dupa esecuri repetate.
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (e: any) {
    console.error("Eroare la procesarea webhook-ului WhatsApp:", e?.message);
    // Raspundem tot cu 200 ca sa nu declansam retry-uri agresive din
    // partea Meta pentru un payload pe care oricum nu-l procesam inca.
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }
}