import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Inițializare Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16" as any,
});

// Pentru rutele de tip API (Server Side), folosim Service Role pentru a avea drepturi depline
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: Request) {
  try {
    // 1. Verificăm configurația cheilor
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Eroare Configurare: Service Role Key lipsește." }, { status: 500 });
    }

    // 2. Verificăm token-ul de autentificare al utilizatorului
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Eroare: Neautorizat (Lipsă Token)." }, { status: 401 });
    }

    // Validăm utilizatorul prin Supabase Admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Eroare: Sesiune invalidă." }, { status: 401 });
    }

    // 3. Preluăm stripe_customer_id din tabelul profiles
    const { data: profile, error: dbError } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (dbError || !profile?.stripe_customer_id) {
      console.error("DB Error sau ID Lipsă:", dbError);
      return NextResponse.json({ error: "Clientul Stripe nu a fost găsit în baza de date." }, { status: 404 });
    }

    // 4. Creăm sesiunea pentru Portalul de Billing
    // Folosim o logică de fallback pentru URL-ul de returnare
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${baseUrl}/setari`, // Trimitem utilizatorul înapoi la Setări
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("Portal Error:", err.message);
    return NextResponse.json({ error: "Eroare Server: " + err.message }, { status: 500 });
  }
}