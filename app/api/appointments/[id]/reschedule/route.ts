import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifyWaitlistIfAny } from "@/lib/notifyWaitlist";

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { date, time } = body;

  if (!date || !time) {
    return NextResponse.json({ error: "missing_data" }, { status: 400 });
  }

  const { data: appt, error: fetchError } = await supabaseAdmin
    .from("appointments")
    .select("id, angajat_id, duration, user_id, status, date, time, serviciu_id")
    .eq("id", id)
    .single();

  if (fetchError || !appt) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (appt.status === "cancelled") {
    return NextResponse.json({ error: "already_cancelled" }, { status: 400 });
  }

  // ✅ Verificăm suprapunerea DOAR pentru același specialist, exact ca la
  // restul aplicației — dacă nu are specialist ales, nu blocăm nimic
  if (appt.angajat_id) {
    const { data: others } = await supabaseAdmin
      .from("appointments")
      .select("id, time, duration")
      .eq("user_id", appt.user_id)
      .eq("angajat_id", appt.angajat_id)
      .eq("date", date)
      .neq("status", "cancelled")
      .neq("id", id);

    const newStart = timeToMin(time);
    const newEnd = newStart + (appt.duration || 30);
    const conflict = (others || []).some((o) => {
      const s = timeToMin(o.time);
      const e = s + (o.duration || 30);
      return newStart < e && newEnd > s;
    });

    if (conflict) {
      return NextResponse.json({ error: "conflict" }, { status: 409 });
    }
  }

  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ date, time, reminder_sent: false }) // resetăm reamintirea, ca să se trimită pentru noua dată
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ✅ Vechiul loc tocmai s-a eliberat — verificăm lista de așteptare pentru el
  notifyWaitlistIfAny(appt.user_id, appt.angajat_id, appt.date, appt.time, appt.duration || 30, appt.serviciu_id).catch(() => {});

  return NextResponse.json({ success: true });
}