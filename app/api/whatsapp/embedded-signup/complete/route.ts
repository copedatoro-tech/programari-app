import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DEFAULT_WHATSAPP_WORK_LOCATION_ID } from "@/lib/businessWhatsApp";

type CompleteSignupBody = {
  code?: string;
  wabaId?: string;
  waba_id?: string;
  phoneNumberId?: string;
  phone_number_id?: string;
  displayPhoneNumber?: string;
  display_phone_number?: string;
  workLocationId?: string | null;
};

async function updateConnectionError(userId: string, workLocationId: string, message: string) {
  await supabaseAdmin
    .from("business_whatsapp_connections")
    .upsert({
      user_id: userId,
      work_location_id: workLocationId,
      status: "setup_failed",
      last_error: message,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,work_location_id" });
}

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
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as CompleteSignupBody;
  const code = body.code;
  const wabaId = body.wabaId || body.waba_id;
  const phoneNumberId = body.phoneNumberId || body.phone_number_id;
  const displayPhoneNumber = body.displayPhoneNumber || body.display_phone_number || null;
  const workLocationId = body.workLocationId || DEFAULT_WHATSAPP_WORK_LOCATION_ID;

  if (!code || !wabaId || !phoneNumberId) {
    return NextResponse.json({ error: "Date Meta lipsă pentru finalizarea conectării WhatsApp." }, { status: 400 });
  }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const graphVersion = process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v23.0";

  if (!appId || !appSecret) {
    await updateConnectionError(user.id, workLocationId, "Meta App ID sau Meta App Secret lipsesc din environment.");
    return NextResponse.json({ error: "Meta nu este configurat complet pe server." }, { status: 500 });
  }

  const tokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString());
  const tokenJson = await tokenRes.json();

  if (!tokenRes.ok || !tokenJson.access_token) {
    const message = tokenJson?.error?.message || "Nu am putut obține access token de la Meta.";
    await updateConnectionError(user.id, workLocationId, message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const accessToken = tokenJson.access_token as string;

  const subscribeRes = await fetch(`https://graph.facebook.com/${graphVersion}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const subscribeJson = await subscribeRes.json().catch(() => ({}));

  if (!subscribeRes.ok) {
    const message = subscribeJson?.error?.message || "Conexiunea Meta a fost autorizată, dar webhook-ul nu a putut fi abonat.";
    await supabaseAdmin
      .from("business_whatsapp_connections")
      .upsert({
        user_id: user.id,
        work_location_id: workLocationId,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        display_phone_number: displayPhoneNumber,
        access_token: accessToken,
        status: "meta_authorized",
        last_error: message,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,work_location_id" });
    return NextResponse.json({ error: message, status: "meta_authorized" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("business_whatsapp_connections")
    .upsert({
      user_id: user.id,
      work_location_id: workLocationId,
      waba_id: wabaId,
      phone_number_id: phoneNumberId,
      display_phone_number: displayPhoneNumber,
      access_token: accessToken,
      status: "connected",
      templates_status: "not_configured",
      last_error: null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,work_location_id" })
    .select("work_location_id,business_name,country_code,default_language,display_phone_number,status,templates_status,connected_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ connected: true, connection: data });
}
