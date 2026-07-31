import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_UPLOADS_PER_IP_PER_DAY = 50; // generos - un client poate incerca de mai multe ori pana reuseste

// 🔒 Blocam DOAR formatele executabile/script, periculoase — acceptam orice
// altceva (poze, PDF, Word, Excel, video, audio etc.)
const BLOCKED_EXTENSIONS = [
  "exe", "bat", "cmd", "com", "scr", "msi", "js", "mjs", "cjs",
  "php", "phtml", "jar", "vbs", "vbe", "ps1", "psm1", "app", "dmg",
  "apk", "sh", "bash", "wsf", "hta", "reg", "dll", "so",
];

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const adminId = formData.get("adminId") as string | null;

    if (!file || !adminId) {
      return NextResponse.json({ error: "Date lipsă." }, { status: 400 });
    }

    // 🔒 Verificam ca salonul chiar are activata optiunea de incarcare documente
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("allow_client_documents")
      .eq("id", adminId)
      .maybeSingle();

    if (!profile?.allow_client_documents) {
      return NextResponse.json({ error: "Acest salon nu acceptă încărcare de documente." }, { status: 403 });
    }

    // 🔒 Validare dimensiune — max 10MB per fisier
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Fișierul depășește limita de 10MB." }, { status: 400 });
    }

    // 🔒 Validare extensie — blocam doar formatele periculoase
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: "Acest tip de fișier nu este permis din motive de securitate." }, { status: 400 });
    }

    // 🔒 Rate limiting per IP — reutilizam tabela existenta de la create-booking
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("booking_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", since);

    if (countError) {
      console.error("Eroare verificare rate limit upload:", countError.message);
    } else if ((count || 0) >= MAX_UPLOADS_PER_IP_PER_DAY) {
      return NextResponse.json({ error: "Ai atins limita de încărcări pentru azi." }, { status: 429 });
    }

    await supabaseAdmin.from("booking_rate_limits").insert({ ip_address: ip });

    // ✅ Sanitizam numele fisierului (diacritice + caractere speciale)
    const cleanExt = ext.replace(/[^a-z0-9]/g, "") || "bin";
    const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${cleanExt}`;
    const storagePath = `client-uploads/${adminId}/${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("appointment-photos")
      .upload(storagePath, Buffer.from(arrayBuffer), {
        contentType: file.type || "application/octet-stream",
      });

    if (uploadErr) {
      console.error("Eroare upload storage:", uploadErr.message);
      return NextResponse.json({ error: "Eroare la încărcarea fișierului." }, { status: 500 });
    }

    const { data: pub } = supabaseAdmin.storage.from("appointment-photos").getPublicUrl(storagePath);

    return NextResponse.json({ success: true, url: pub.publicUrl, name: file.name });
  } catch (err: any) {
    console.error("Eroare upload document rezervare:", err.message);
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 });
  }
}