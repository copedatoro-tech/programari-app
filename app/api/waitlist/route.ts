import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Aceeași limită folosită și la create-booking — o cerere de waitlist e la
// fel de "ieftină" de generat ca o rezervare, deci merită aceeași protecție.
const MAX_WAITLIST_PER_IP_PER_DAY = 3;

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
    const { turnstileToken, adminId, specialistId, serviciuId, date, clientName, clientPhone, clientEmail } = body;

    // ── Validari de baza ────────────────────────────────────────────────
    if (!adminId || !date || !clientName || !clientEmail) {
      return NextResponse.json({ error: "missing_data" }, { status: 400 });
    }

    // ── Verificare anti-bot (Cloudflare Turnstile) ──────────────────────
    // 🔒 FIX: lipsea complet — oricine putea trimite direct catre acest
    // endpoint, fara sa treaca prin formularul real (care are widgetul
    // Turnstile), la fel ca la create-booking.
    const turnstileOk = await verifyTurnstile(turnstileToken, ip);
    if (!turnstileOk) {
      return NextResponse.json({ error: "Verificarea de securitate a esuat. Reincearca." }, { status: 400 });
    }

    // ── Rate limiting per IP (maxim 3 inscrieri in waitlist / 24h) ──────
    // 🔒 FIX: reutilizam tabela "booking_rate_limits" existenta — e agnostica
    // fata de tipul cererii, conteaza doar IP-ul si momentul.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("booking_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", since);

    if (countError) {
      console.error("Eroare verificare rate limit waitlist:", countError.message);
    } else if ((count || 0) >= MAX_WAITLIST_PER_IP_PER_DAY) {
      return NextResponse.json(
        { error: "Ai atins limita de inscrieri pentru azi. Te rugam sa incerci din nou maine, sau sa suni direct salonul." },
        { status: 429 }
      );
    }

    // ── Verificare ca adminId chiar exista ──────────────────────────────
    // 🔒 FIX: lipsea complet — se putea insera orice adminId, chiar
    // inexistent, poluand tabela cu inregistrari orfane.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", adminId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Salon inexistent." }, { status: 400 });
    }

    // ── Verificare ca serviciul chiar apartine acestui salon ────────────
    // 🔒 FIX: lipsea complet — se putea trimite un serviciu de la alt salon,
    // combinat cu adminId-ul curent, generand inregistrari incoerente.
    if (serviciuId) {
      const { data: service, error: serviceError } = await supabaseAdmin
        .from("services")
        .select("id")
        .eq("id", serviciuId)
        .eq("user_id", adminId)
        .maybeSingle();

      if (serviceError || !service) {
        return NextResponse.json({ error: "Serviciul nu aparține acestui salon." }, { status: 400 });
      }
    }

    // ── Verificare ca specialistul chiar apartine acestui salon ─────────
    if (specialistId) {
      const { data: specialist, error: specialistError } = await supabaseAdmin
        .from("staff")
        .select("id")
        .eq("id", specialistId)
        .eq("user_id", adminId)
        .maybeSingle();

      if (specialistError || !specialist) {
        return NextResponse.json({ error: "Specialistul nu aparține acestui salon." }, { status: 400 });
      }
    }

    // ── Inregistram incercarea (pentru rate limiting) ───────────────────
    await supabaseAdmin.from("booking_rate_limits").insert({ ip_address: ip });

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
  } catch (err: any) {
    console.error("Eroare waitlist:", err.message);
    return NextResponse.json({ error: "Eroare interna." }, { status: 500 });
  }
}