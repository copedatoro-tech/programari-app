import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Inițializare Stripe cu verificare de siguranță
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16" as any,
});

export async function POST(req: Request) {
  try {
    const { priceId, planName, locale } = await req.json();
    // ✅ Prefix de limbă valid — implicit "ro" dacă nu vine deloc din frontend
    const localePrefix = locale || "ro";

    // Validare date primite
    if (!priceId) {
      return NextResponse.json({ error: "Lipsește ID-ul prețului (Price ID)" }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Configurație server incompletă (Stripe Key)" }, { status: 500 });
    }

    // ✅ Identificăm userul curent din sesiunea Supabase (server-side),
    // ca să știm cărui cont să-i actualizăm plan_type după plată
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
            // No-op: nu setăm cookie-uri într-un API route de checkout
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Trebuie să fii autentificat pentru a schimba abonamentul." }, { status: 401 });
    }

    // ✅ Verificăm dacă userul are deja un stripe_customer_id salvat —
    // dacă da, îl refolosim (Stripe recomandă asta, evită clienți duplicați)
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,

      // ✅ Cheia care lipsea: identifică userul Supabase în sesiunea Stripe,
      // ca webhook-ul să știe cărui cont să-i actualizeze plan_type
      client_reference_id: user.id,

      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${localePrefix}/settings?plata=succes&plan=${planName}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${localePrefix}/settings?plata=anulata`,

      metadata: {
        userId: user.id,
        plan: planName,
      },
    };

    // ✅ Refolosim clientul Stripe existent, dacă există deja,
    // în loc să lăsăm Stripe să creeze unul nou de fiecare dată
    if (profile?.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id;
    } else {
      sessionParams.customer_email = profile?.email || user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("STRIPE CHECKOUT ERROR:", err.message);
    return NextResponse.json(
      { error: "Eroare la procesarea plății: " + err.message },
      { status: 500 }
    );
  }
}