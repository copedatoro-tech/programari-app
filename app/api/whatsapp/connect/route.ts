import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { upsertPreparedBusinessWhatsAppConnection } from "@/lib/businessWhatsApp";

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

  const body = await request.json().catch(() => ({}));
  const { businessName, countryCode, defaultLanguage, displayPhoneNumber } = body || {};

  const { data, error } = await upsertPreparedBusinessWhatsAppConnection({
    userId: user.id,
    businessName,
    countryCode,
    defaultLanguage,
    displayPhoneNumber,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const embeddedSignupUrl = process.env.META_WHATSAPP_EMBEDDED_SIGNUP_URL;
  if (!embeddedSignupUrl) {
    return NextResponse.json({
      connection: data,
      setupReady: false,
      reason: "meta_embedded_signup_not_configured",
    });
  }

  return NextResponse.json({
    connection: data,
    setupReady: true,
    url: embeddedSignupUrl,
  });
}
