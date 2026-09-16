import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// -------------------------------------------------------------------------
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
// -------------------------------------------------------------------------

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
const GRAPH_VERSION = process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v23.0";

type WhatsAppWebhookMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
};

type WhatsAppWebhookContact = {
  wa_id?: string;
  profile?: { name?: string };
};

function getHoldingReply(language?: string | null) {
  const lang = (language || "ro").toLowerCase().split(/[-_]/)[0];
  const replies: Record<string, string> = {
    ro: "Buna! Am primit mesajul tau. Asistentul Chronos verifica detaliile si revine imediat cu urmatorul pas.",
    en: "Hi! We received your message. The Chronos assistant is checking the details and will reply with the next step shortly.",
    it: "Ciao! Abbiamo ricevuto il tuo messaggio. L'assistente Chronos verifica i dettagli e risponde a breve con il prossimo passo.",
    fr: "Bonjour ! Nous avons reçu votre message. L'assistant Chronos vérifie les détails et répondra bientôt avec la prochaine étape.",
    de: "Hallo! Wir haben deine Nachricht erhalten. Der Chronos-Assistent prüft die Details und meldet sich gleich mit dem nächsten Schritt.",
    es: "Hola. Hemos recibido tu mensaje. El asistente Chronos revisa los detalles y responderá pronto con el siguiente paso.",
    pt: "Olá! Recebemos a tua mensagem. O assistente Chronos está a verificar os detalhes e responderá em breve com o próximo passo.",
    pl: "Cześć! Otrzymaliśmy Twoją wiadomość. Asystent Chronos sprawdza szczegóły i wkrótce odpowie z kolejnym krokiem.",
    hu: "Szia! Megkaptuk az üzeneted. A Chronos asszisztens ellenőrzi a részleteket, és hamarosan válaszol a következő lépéssel.",
  };
  return replies[lang] || replies.ro;
}

async function sendWhatsAppText(phoneNumberId: string, accessToken: string, to: string, text: string) {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  return res.json().catch(() => ({}));
}

async function processInboundMessage(input: {
  phoneNumberId: string;
  contact?: WhatsAppWebhookContact;
  message: WhatsAppWebhookMessage;
  rawPayload: unknown;
}) {
  if (!input.message.from) return;

  const { data: connection, error: connectionError } = await supabaseAdmin
    .from("business_whatsapp_connections")
    .select("id,user_id,default_language,phone_number_id,access_token,status,ai_receptionist_enabled")
    .eq("phone_number_id", input.phoneNumberId)
    .maybeSingle();

  if (connectionError || !connection?.user_id) {
    console.warn("WhatsApp webhook without matching business connection:", input.phoneNumberId, connectionError?.message);
    return;
  }

  const customerPhone = input.contact?.wa_id || input.message.from;
  const customerName = input.contact?.profile?.name || null;
  const text = input.message.text?.body || null;

  const { data: conversation, error: conversationError } = await supabaseAdmin
    .from("whatsapp_ai_conversations")
    .upsert({
      user_id: connection.user_id,
      connection_id: connection.id,
      customer_phone: customerPhone,
      customer_name: customerName,
      language: connection.default_language || "ro",
      status: "open",
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,customer_phone" })
    .select("id")
    .single();

  if (conversationError || !conversation?.id) {
    console.warn("Could not store WhatsApp AI conversation:", conversationError?.message);
    return;
  }

  await supabaseAdmin.from("whatsapp_ai_messages").insert({
    conversation_id: conversation.id,
    user_id: connection.user_id,
    direction: "inbound",
    message_type: input.message.type || "text",
    whatsapp_message_id: input.message.id || null,
    content: text,
    raw_payload: input.rawPayload,
  });

  if (connection.status !== "connected" || !connection.ai_receptionist_enabled || !connection.access_token) {
    return;
  }

  const reply = getHoldingReply(connection.default_language);
  const sendResult = await sendWhatsAppText(input.phoneNumberId, connection.access_token, customerPhone, reply);
  await supabaseAdmin.from("whatsapp_ai_messages").insert({
    conversation_id: conversation.id,
    user_id: connection.user_id,
    direction: "outbound",
    message_type: "text",
    whatsapp_message_id: sendResult?.messages?.[0]?.id || null,
    content: reply,
    raw_payload: sendResult,
  });
}

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

    console.log("WhatsApp webhook event:", JSON.stringify(body));

    for (const entry of body?.entry || []) {
      for (const change of entry?.changes || []) {
        const value = change?.value || {};
        const phoneNumberId = value?.metadata?.phone_number_id;
        const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
        const messages = Array.isArray(value?.messages) ? value.messages : [];
        if (!phoneNumberId || messages.length === 0) continue;

        for (const message of messages) {
          const contact = contacts.find((item: WhatsAppWebhookContact) => item.wa_id === message.from) || contacts[0];
          await processInboundMessage({
            phoneNumberId,
            contact,
            message,
            rawPayload: value,
          });
        }
      }
    }

    // Meta cere raspuns 200 rapid (sub cateva secunde), altfel
    // considera livrarea esuata si reincearca / dezactiveaza webhook-ul
    // dupa esecuri repetate.
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "unknown_error";
    console.error("Eroare la procesarea webhook-ului WhatsApp:", message);
    // Raspundem tot cu 200 ca sa nu declansam retry-uri agresive din
    // partea Meta pentru un payload pe care oricum nu-l procesam inca.
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }
}
