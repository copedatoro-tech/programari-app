import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_SERVICES_PER_BOOKING = 5;
const MAX_BOOKINGS_PER_IP_PER_DAY = 3;

const PLAN_LIMITS: Record<string, number> = {
  "START (GRATUIT)": 30,
  "CHRONOS FREE": 30,
  "CHRONOS PRO": 150,
  "CHRONOS ELITE": 500,
  "CHRONOS TEAM": Infinity,
};

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY || "",
        response: token,
        remoteip: ip,
      }),
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const { turnstileToken, adminId, clientInfo, bookings } = body;

    // ── Validari de baza ────────────────────────────────────────────────
    if (!adminId || !clientInfo?.nume || !clientInfo?.telefon || !clientInfo?.email) {
      return NextResponse.json({ error: "Date incomplete." }, { status: 400 });
    }
    if (!Array.isArray(bookings) || bookings.length === 0) {
      return NextResponse.json({ error: "Nicio programare trimisa." }, { status: 400 });
    }
    if (bookings.length > MAX_SERVICES_PER_BOOKING) {
      return NextResponse.json(
        { error: `Poti trimite maxim ${MAX_SERVICES_PER_BOOKING} servicii intr-o singura rezervare.` },
        { status: 400 }
      );
    }
    for (const b of bookings) {
      if (!b.serviciu_id || !b.data || !b.ora || b.ora === "00:00") {
        return NextResponse.json({ error: "Completeaza serviciul, data si ora pentru toate programarile." }, { status: 400 });
      }
    }

    // ── Verificare anti-bot (Cloudflare Turnstile) ──────────────────────
    const turnstileOk = await verifyTurnstile(turnstileToken, ip);
    if (!turnstileOk) {
      return NextResponse.json({ error: "Verificarea de securitate a esuat. Reincearca." }, { status: 400 });
    }

    // ── Rate limiting per IP (maxim 3 rezervari / 24h) ──────────────────
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("booking_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", since);

    if (countError) {
      console.error("Eroare verificare rate limit:", countError.message);
    } else if ((count || 0) >= MAX_BOOKINGS_PER_IP_PER_DAY) {
      return NextResponse.json(
        { error: "Ai atins limita de rezervari pentru azi. Te rugam sa incerci din nou maine, sau sa suni direct salonul." },
        { status: 429 }
      );
    }

    // ── Verificare limita de plan a salonului ───────────────────────────
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("plan_type")
      .eq("id", adminId)
      .single();

    const plan = profileData?.plan_type || "CHRONOS FREE";
    const maxAppointments = PLAN_LIMITS[plan] ?? 30;

    if (maxAppointments !== Infinity) {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: apptData } = await supabaseAdmin
        .from("appointments")
        .select("id")
        .eq("user_id", adminId)
        .gte("created_at", startOfMonth);

      if (apptData && apptData.length + bookings.length > maxAppointments) {
        return NextResponse.json({ error: "S-a atins limita de programari pentru luna aceasta.", code: "plan_limit" }, { status: 400 });
      }
    }

    // ── Inregistram incercarea (pentru rate limiting) ───────────────────
    await supabaseAdmin.from("booking_rate_limits").insert({ ip_address: ip });

    // ── Preluam serviciile, ca sa stim durata fiecaruia ─────────────────
    const serviceIds = bookings.map((b: any) => b.serviciu_id);
    const { data: services } = await supabaseAdmin
      .from("services")
      .select("id, nume_serviciu, duration")
      .in("id", serviceIds);

    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("id, name")
      .eq("user_id", adminId);

    // ── Inseram programarile ────────────────────────────────────────────
    const insertedIds: string[] = [];
    for (const b of bookings) {
      const svc = services?.find((s) => s.id === b.serviciu_id);
      const duration = svc?.duration || 30;
      const specialistName = staff?.find((s) => s.id === b.specialist_id)?.name || "Prima disponibilitate";

      const payload = {
        user_id: adminId,
        title: clientInfo.nume.trim(),
        prenume: clientInfo.nume.trim(),
        nume: clientInfo.nume.trim(),
        phone: clientInfo.telefon,
        email: clientInfo.email.trim(),
        date: b.data,
        time: b.ora,
        duration,
        details: `Serviciu: ${svc?.nume_serviciu || ""}${clientInfo.detalii ? ` | Notă: ${clientInfo.detalii}` : ""}`,
        specialist: specialistName,
        angajat_id: b.specialist_id || null,
        serviciu_id: b.serviciu_id,
        status: "pending",
        is_client_booking: true,
      };

      const { data: inserted, error } = await supabaseAdmin
        .from("appointments")
        .insert([payload])
        .select("id")
        .single();

      if (error) {
        console.error("Eroare insert programare:", error.message);
        continue;
      }

      if (inserted?.id) {
        insertedIds.push(inserted.id);
        // Trimitem emailul de confirmare, fara sa blocam raspunsul daca esueaza
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: clientInfo.email.trim(),
            nume: clientInfo.nume.trim(),
            data: b.data,
            ora: b.ora,
            appointmentId: inserted.id,
          }),
        }).catch(() => {});
      }
    }

    if (insertedIds.length === 0) {
      return NextResponse.json({ error: "Nu s-a putut salva nicio programare." }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: insertedIds.length });
  } catch (err: any) {
    console.error("Eroare create-booking:", err.message);
    return NextResponse.json({ error: "Eroare interna." }, { status: 500 });
  }
}