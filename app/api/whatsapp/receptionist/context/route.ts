import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getWhatsAppReceptionistBusinessContext } from "@/lib/whatsappAiReceptionist";

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

  try {
    const workLocationId = new URL(request.url).searchParams.get("workLocationId");
    const context = await getWhatsAppReceptionistBusinessContext(user.id, workLocationId);
    return NextResponse.json(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "context_lookup_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
