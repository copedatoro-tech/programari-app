import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = await request.json();
  const { adminId, specialistId, serviciuId, date, clientName, clientPhone, clientEmail } = body;

  if (!adminId || !date || !clientName || !clientEmail) {
    return NextResponse.json({ error: "missing_data" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("waitlist").insert({
    user_id: adminId,
    specialist_id: specialistId || null,
    serviciu_id: serviciuId || null,
    date,
    client_name: clientName,
    client_phone: clientPhone || null,
    client_email: clientEmail,
    status: "waiting",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}