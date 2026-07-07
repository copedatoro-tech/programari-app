import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function parseWH(raw: any): any[] {
  if (!raw) return [];
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return []; } }
  return Array.isArray(raw) ? raw : [];
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: appt, error } = await supabaseAdmin
    .from("appointments")
    .select("id, title, prenume, nume, date, time, duration, status, serviciu_id, angajat_id, user_id")
    .eq("id", id)
    .single();

  if (error || !appt) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let serviceName: string | null = null;
  let specialistName: string | null = null;
  let specialistWorkingHours: any[] = [];

  if (appt.serviciu_id) {
    const { data: svc } = await supabaseAdmin
      .from("services")
      .select("nume_serviciu")
      .eq("id", appt.serviciu_id)
      .single();
    serviceName = svc?.nume_serviciu || null;
  }

  if (appt.angajat_id) {
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("name, working_hours")
      .eq("id", appt.angajat_id)
      .single();
    specialistName = staff?.name || null;
    specialistWorkingHours = parseWH(staff?.working_hours);
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("working_hours, manual_blocks")
    .eq("id", appt.user_id)
    .single();

  const adminWorkingHours = parseWH(profile?.working_hours);
  const effectiveWorkingHours = specialistWorkingHours.length > 0 ? specialistWorkingHours : adminWorkingHours;

  return NextResponse.json({
    id: appt.id,
    clientName: appt.title || appt.prenume || appt.nume,
    date: appt.date,
    time: appt.time,
    duration: appt.duration,
    status: appt.status,
    serviceName,
    specialistName,
    adminId: appt.user_id,
    serviciuId: appt.serviciu_id,
    specialistId: appt.angajat_id,
    workingHours: effectiveWorkingHours,
    manualBlocks: profile?.manual_blocks || {},
  });
}