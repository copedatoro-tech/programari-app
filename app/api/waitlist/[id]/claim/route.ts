import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifyWaitlistIfAny } from "@/lib/notifyWaitlist";

const EXPIRY_MINUTES = 15;

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: entry, error } = await supabaseAdmin
    .from("waitlist")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !entry) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (entry.status === "confirmed") {
    return NextResponse.json({ error: "already_done" }, { status: 400 });
  }
  if (entry.status !== "notified" || !entry.offered_slot) {
    return NextResponse.json({ error: "not_available" }, { status: 400 });
  }

  const elapsedMin = entry.notified_at ? (Date.now() - new Date(entry.notified_at).getTime()) / 60000 : 999;
  if (elapsedMin > EXPIRY_MINUTES) {
    await supabaseAdmin.from("waitlist").update({ status: "expired" }).eq("id", id);
    // ✅ Trecem automat la următoarea persoană de pe listă, pentru același loc
    const slot = entry.offered_slot;
    notifyWaitlistIfAny(entry.user_id, slot.specialistId, slot.date, slot.time, slot.duration || 30, slot.serviciuId).catch(() => {});
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  const slot = entry.offered_slot;

  // ✅ Ne asigurăm că locul chiar mai e liber (nu l-a luat altcineva între timp)
  if (slot.specialistId) {
    const { data: conflicting } = await supabaseAdmin
      .from("appointments")
      .select("time, duration")
      .eq("user_id", entry.user_id)
      .eq("angajat_id", slot.specialistId)
      .eq("date", slot.date)
      .neq("status", "cancelled");

    const newStart = timeToMin(slot.time);
    const newEnd = newStart + (slot.duration || 30);
    const hasConflict = (conflicting || []).some((o) => {
      const s = timeToMin(o.time);
      const e = s + (o.duration || 30);
      return newStart < e && newEnd > s;
    });

    if (hasConflict) {
      await supabaseAdmin.from("waitlist").update({ status: "expired" }).eq("id", id);
      notifyWaitlistIfAny(entry.user_id, slot.specialistId, slot.date, slot.time, slot.duration || 30, slot.serviciuId).catch(() => {});
      return NextResponse.json({ error: "taken" }, { status: 409 });
    }
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("appointments")
    .insert({
      user_id: entry.user_id,
      title: entry.client_name,
      prenume: entry.client_name,
      nume: entry.client_name,
      phone: entry.client_phone,
      email: entry.client_email,
      date: slot.date,
      time: slot.time,
      duration: slot.duration || 30,
      angajat_id: slot.specialistId || null,
      serviciu_id: slot.serviciuId || null,
      status: "pending",
      is_client_booking: true,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await supabaseAdmin.from("waitlist").update({ status: "confirmed" }).eq("id", id);

  // Email de confirmare, cu link de auto-gestionare, ca la orice altă programare
  if (inserted?.id) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    fetch(`${baseUrl}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: entry.client_email,
        nume: entry.client_name,
        data: slot.date,
        ora: slot.time,
        appointmentId: inserted.id,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}