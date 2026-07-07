import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: appt, error: fetchError } = await supabaseAdmin
    .from("appointments")
    .select("id, status")
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

  return NextResponse.json({ success: true });
}