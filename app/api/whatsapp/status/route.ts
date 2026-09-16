import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
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

  const { data, error } = await supabase
    .from("business_whatsapp_connections")
    .select("business_name,country_code,default_language,display_phone_number,status,templates_status,last_error,connected_at,updated_at,ai_receptionist_enabled,ai_receptionist_status,ai_receptionist_handoff_phone,ai_receptionist_notes")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    connected: data?.status === "connected",
    connection: data || null,
  });
}
