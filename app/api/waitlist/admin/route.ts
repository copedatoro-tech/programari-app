import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function getAuthenticatedUser() {
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
  return user;
}

export async function GET() {
  const user = await getAuthenticatedUser();
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
    requestedTime: e.requested_time,
    status: e.status,
    createdAt: e.created_at,
    specialistName: staffRows?.find((s) => s.id === e.specialist_id)?.name || null,
    serviceName: serviceRows?.find((s) => s.id === e.serviciu_id)?.nume_serviciu || null,
  }));
  return NextResponse.json({ entries: result });
}

// ✅ Adăugare manuală pe lista de așteptare, direct din panoul admin —
// util cand adminul stie ca cineva vrea o data/ora anume ("nunta", spre
// exemplu), fara sa treaca prin fluxul public de rezervare.
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientName, clientPhone, clientEmail, date, requestedTime, specialistId, serviciuId } = body;

    if (!clientName?.trim() || !clientEmail?.trim() || !date) {
      return NextResponse.json({ error: "Nume, email și dată sunt obligatorii." }, { status: 400 });
    }

    // 🔒 Verificam ca serviciul/specialistul (daca sunt trimise) apartin
    // chiar acestui admin — acelasi standard ca la rezervarea publica.
    if (serviciuId) {
      const { data: svc } = await supabaseAdmin
        .from("services")
        .select("id")
        .eq("id", serviciuId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!svc) {
        return NextResponse.json({ error: "Serviciul selectat nu aparține contului tău." }, { status: 400 });
      }
    }
    if (specialistId) {
      const { data: staffRow } = await supabaseAdmin
        .from("staff")
        .select("id")
        .eq("id", specialistId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!staffRow) {
        return NextResponse.json({ error: "Specialistul selectat nu aparține contului tău." }, { status: 400 });
      }
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("waitlist")
      .insert({
        user_id: user.id,
        specialist_id: specialistId || null,
        serviciu_id: serviciuId || null,
        date,
        requested_time: requestedTime || null,
        client_name: clientName.trim(),
        client_phone: clientPhone?.trim() || null,
        client_email: clientEmail.trim(),
        status: "waiting",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: inserted.id });
  } catch (err: any) {
    console.error("Eroare adaugare manuala waitlist:", err.message);
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 });
  }
}