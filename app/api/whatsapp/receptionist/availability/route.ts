import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getWhatsAppReceptionistAvailability } from "@/lib/whatsappAiReceptionist";

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
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");
  const specialistId = searchParams.get("specialistId");
  const workLocationId = searchParams.get("workLocationId");

  if (!serviceId || !date) {
    return NextResponse.json({ error: "missing_service_or_date" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  try {
    const availability = await getWhatsAppReceptionistAvailability({
      userId: user.id,
      serviceId,
      date,
      specialistId,
      workLocationId,
    });
    return NextResponse.json(availability);
  } catch (error) {
    const message = error instanceof Error ? error.message : "availability_lookup_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
