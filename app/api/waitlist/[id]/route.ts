import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const EXPIRY_MINUTES = 15;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: entry, error } = await supabaseAdmin
    .from("waitlist")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !entry) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let effectiveStatus = entry.status;
  if (entry.status === "notified" && entry.notified_at) {
    const elapsedMin = (Date.now() - new Date(entry.notified_at).getTime()) / 60000;
    if (elapsedMin > EXPIRY_MINUTES) effectiveStatus = "expired";
  }

  return NextResponse.json({
    id: entry.id,
    status: effectiveStatus,
    clientName: entry.client_name,
    offeredSlot: entry.offered_slot,
    notifiedAt: entry.notified_at,
  });
}