import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateReceptionistReply } from "@/lib/whatsappAiReply";
import { DEFAULT_WHATSAPP_WORK_LOCATION_ID } from "@/lib/businessWhatsApp";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Neautorizat. Trebuie sa fii logat in Chronos in acest browser." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { message?: string; workLocationId?: string; reset?: boolean };
  const message = (body.message || "").trim();
  if (!message) {
    return NextResponse.json({ error: "Lipseste 'message' din body." }, { status: 400 });
  }

  const workLocationId = body.workLocationId || DEFAULT_WHATSAPP_WORK_LOCATION_ID;
  const testCustomerPhone = "40000000000_test";

  const { data: existingConnectionRaw } = await supabaseAdmin
    .from("business_whatsapp_connections")
    .select("id,user_id,work_location_id,default_language,ai_receptionist_rules,ai_receptionist_tone,ai_receptionist_notes,ai_receptionist_handoff_phone,ai_receptionist_handoff_country")
    .eq("user_id", user.id)
    .eq("work_location_id", workLocationId)
    .maybeSingle();

  let connection = existingConnectionRaw;
  if (!connection) {
    const { data: created, error: createError } = await supabaseAdmin
      .from("business_whatsapp_connections")
      .upsert({
        user_id: user.id,
        work_location_id: workLocationId,
        status: "test_only",
        ai_receptionist_enabled: true,
        ai_receptionist_rules: ["confirm_before_booking", "offer_only_available_slots", "ask_for_missing_details"],
        ai_receptionist_tone: "professional",
        default_language: "ro",
      }, { onConflict: "user_id,work_location_id" })
      .select("id,user_id,work_location_id,default_language,ai_receptionist_rules,ai_receptionist_tone,ai_receptionist_notes,ai_receptionist_handoff_phone,ai_receptionist_handoff_country")
      .single();
    if (createError || !created) {
      return NextResponse.json({ error: createError?.message || "Nu am putut crea o conexiune de test." }, { status: 500 });
    }
    connection = created;
  }

  let conversationId: string;
  const { data: existingConversation } = await supabaseAdmin
    .from("whatsapp_ai_conversations")
    .select("id")
    .eq("connection_id", connection.id)
    .eq("customer_phone", testCustomerPhone)
    .maybeSingle();

  if (body.reset || !existingConversation) {
    if (existingConversation) {
      await supabaseAdmin.from("whatsapp_ai_messages").delete().eq("conversation_id", existingConversation.id);
      await supabaseAdmin.from("whatsapp_ai_conversations").delete().eq("id", existingConversation.id);
    }
    const { data: newConversation, error: convError } = await supabaseAdmin
      .from("whatsapp_ai_conversations")
      .insert({
        user_id: user.id,
        connection_id: connection.id,
        customer_phone: testCustomerPhone,
        customer_name: "Client Test",
        language: connection.default_language || "ro",
        status: "open",
      })
      .select("id")
      .single();
    if (convError || !newConversation) {
      return NextResponse.json({ error: convError?.message || "Nu am putut crea conversatia de test." }, { status: 500 });
    }
    conversationId = newConversation.id;
  } else {
    conversationId = existingConversation.id;
  }

  await supabaseAdmin.from("whatsapp_ai_messages").insert({
    conversation_id: conversationId,
    user_id: user.id,
    direction: "inbound",
    message_type: "text",
    content: message,
  });

  const result = await generateReceptionistReply({
    conversationId,
    connection,
    customerPhone: testCustomerPhone,
    customerName: "Client Test",
  });

  await supabaseAdmin.from("whatsapp_ai_messages").insert({
    conversation_id: conversationId,
    user_id: user.id,
    direction: "outbound",
    message_type: "text",
    content: result.replyText,
  });

  return NextResponse.json({
    reply: result.replyText,
    bookedAppointmentId: result.bookedAppointmentId || null,
    usedRealConnection: Boolean(existingConnectionRaw),
    connectionStatus: connection.id ? (existingConnectionRaw ? "real" : "test_only") : "unknown",
    conversationId,
  });
}
