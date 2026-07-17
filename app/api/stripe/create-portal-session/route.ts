import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { locale } = await req.json().catch(() => ({ locale: "ro" }));
    const localePrefix = locale || "ro";

    // ✅ Identificăm userul curent din sesiunea Supabase (server-side)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // No-op: nu setăm cookie-uri într-un API route
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Trebuie să fii autentificat." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "Nu ai niciun abonament plătit activ momentan." },
        { status: 400 }
      );
    }

    // ✅ Sesiune Stripe Customer Portal — userul își vede singur facturile,
    // își schimbă cardul, sau anulează abonamentul, fără să te contacteze pe tine
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${localePrefix}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });

  } catch (err: any) {
    console.error("STRIPE PORTAL ERROR:", err.message);
    return NextResponse.json(
      { error: "Eroare la deschiderea portalului de abonament: " + err.message },
      { status: 500 }
    );
  }
}