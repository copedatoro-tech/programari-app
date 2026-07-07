import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "missing_date" }, { status: 400 });
  }

  const { data: appt } = await supabaseAdmin
    .from("appointments")
    .select("angajat_id, user_id")
    .eq("id", id)
    .single();

  if (!appt?.angajat_id) {
    return NextResponse.json({ slots: [] });
  }

  const { data } = await supabaseAdmin
    .from("appointments")
    .select("time, duration")
    .eq("user_id", appt.user_id)
    .eq("angajat_id", appt.angajat_id)
    .eq("date", date)
    .neq("status", "cancelled")
    .neq("id", id);

  return NextResponse.json({ slots: data || [] });
}