import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifyWaitlistIfAny } from "@/lib/notifyWaitlist";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: appt, error: fetchError } = await supabaseAdmin
    .from("appointments")
    .select("id, status, user_id, angajat_id, serviciu_id, date, time, duration")
    .eq("id", id)
    .single();

  if (fetchError || !appt) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (appt.status === "cancelled") {
    return NextResponse.json({ success: true, alreadyCancelled: true });
  }

  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ✅ Locul tocmai s-a eliberat — verificăm dacă cineva de pe lista de așteptare îl vrea
  notifyWaitlistIfAny(appt.user_id, appt.angajat_id, appt.date, appt.time, appt.duration || 30, appt.serviciu_id).catch(() => {});

  return NextResponse.json({ success: true });
}