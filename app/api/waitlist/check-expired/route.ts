import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifyWaitlistIfAny } from "@/lib/notifyWaitlist";

const EXPIRY_MINUTES = 15;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60000).toISOString();

  const { data: expiredEntries } = await supabaseAdmin
    .from("waitlist")
    .select("*")
    .eq("status", "notified")
    .lt("notified_at", cutoff);

  if (!expiredEntries || expiredEntries.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  for (const entry of expiredEntries) {
    await supabaseAdmin.from("waitlist").update({ status: "expired" }).eq("id", entry.id);
    const slot = entry.offered_slot;
    if (slot) {
      await notifyWaitlistIfAny(entry.user_id, slot.specialistId, slot.date, slot.time, slot.duration || 30, slot.serviciuId);
    }
    processed++;
  }

  return NextResponse.json({ processed });
}