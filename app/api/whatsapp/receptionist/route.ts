import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ReceptionistSettingsBody = {
  enabled?: boolean;
  handoffPhone?: string | null;
  notes?: string | null;
  tone?: string | null;
  rules?: string[] | null;
  featuredServiceIds?: string[] | null;
};

const ALLOWED_TONES = new Set(["professional", "warm", "concise", "premium"]);
const ALLOWED_RULES = new Set([
  "confirm_before_booking",
  "offer_only_available_slots",
  "handoff_on_uncertainty",
  "mention_payment_policy",
  "ask_for_missing_details",
]);

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
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as ReceptionistSettingsBody;
  const enabled = Boolean(body.enabled);
  const handoffPhone = typeof body.handoffPhone === "string" ? body.handoffPhone.trim() : null;
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : null;
  const tone = typeof body.tone === "string" && ALLOWED_TONES.has(body.tone) ? body.tone : "professional";
  const rules = Array.isArray(body.rules) ? body.rules.filter((rule) => ALLOWED_RULES.has(rule)) : [];
  const featuredServiceIds = Array.isArray(body.featuredServiceIds)
    ? body.featuredServiceIds.filter((id) => typeof id === "string").slice(0, 8)
    : [];

  const { data, error } = await supabaseAdmin
    .from("business_whatsapp_connections")
    .update({
      ai_receptionist_enabled: enabled,
      ai_receptionist_status: enabled ? "active" : "inactive",
      ai_receptionist_handoff_phone: handoffPhone || null,
      ai_receptionist_notes: notes || null,
      ai_receptionist_tone: tone,
      ai_receptionist_rules: rules,
      ai_receptionist_featured_service_ids: featuredServiceIds,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select("business_name,country_code,default_language,display_phone_number,status,templates_status,last_error,connected_at,updated_at,ai_receptionist_enabled,ai_receptionist_status,ai_receptionist_handoff_phone,ai_receptionist_notes,ai_receptionist_tone,ai_receptionist_rules,ai_receptionist_featured_service_ids")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "whatsapp_not_connected" }, { status: 404 });
  }

  return NextResponse.json({ connection: data });
}
