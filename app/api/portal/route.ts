import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Folosim variabila corectă pe care am văzut-o în Vercel-ul tău
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16" as any, // Folosim o versiune stabilă pentru a evita erori de tip
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zzrubdbngjfwurdwxtwf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || "");

export async function POST(req: Request) {
  try {
    // 1. Verificăm configurația serverului
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return new NextResponse("Eroare Configurare: Lipsă SERVICE_ROLE_KEY în Vercel.", { status: 500 });
    }

    // 2. Verificăm sesiunea utilizatorului
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) return new NextResponse("Eroare: Lipsă Token de autentificare.", { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new NextResponse("Eroare: Utilizator neautorizat sau sesiune expirată.", { status: 401 });
    }

    // 3. Căutăm ID-ul Stripe în baza de date
    const { data: profile, error: dbError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (dbError) {
      console.error("Supabase Database Error:", dbError);
    }

    // Mesaj specific dacă ID-ul lipsește (Cauza problemei tale)
    if (!profile?.stripe_customer_id) {
      return new NextResponse("Customer not found", { status: 404 });
    }

    // 4. Generăm link-ul către Portal
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin}/abonamente`,
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("Portal Critical Error:", err.message);
    return new NextResponse("Eroare Server: " + err.message, { status: 500 });
  }
}