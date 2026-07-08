import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const { data: entries, error } = await supabaseAdmin
    .from("waitlist")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Adăugăm numele specialistului/serviciului, pentru afișare
  const specialistIds = [...new Set((entries || []).map((e) => e.specialist_id).filter(Boolean))];
  const serviceIds = [...new Set((entries || []).map((e) => e.serviciu_id).filter(Boolean))];

  const { data: staffRows } = specialistIds.length
    ? await supabaseAdmin.from("staff").select("id, name").in("id", specialistIds)
    : { data: [] };
  const { data: serviceRows } = serviceIds.length
    ? await supabaseAdmin.from("services").select("id, nume_serviciu").in("id", serviceIds)
    : { data: [] };

  const result = (entries || []).map((e) => ({
    id: e.id,
    clientName: e.client_name,
    clientPhone: e.client_phone,
    clientEmail: e.client_email,
    date: e.date,
    status: e.status,
    createdAt: e.created_at,
    specialistName: staffRows?.find((s) => s.id === e.specialist_id)?.name || null,
    serviceName: serviceRows?.find((s) => s.id === e.serviciu_id)?.nume_serviciu || null,
  }));

  return NextResponse.json({ entries: result });
}